import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WinstonLoggerService } from '../../common/services/logger.service';
import { StripeService } from './stripe.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionService {
    private frontendUrl: string;

    constructor(
        private prisma: PrismaService,
        private stripeService: StripeService,
        private configService: ConfigService,
        private logger: WinstonLoggerService,
    ) {
        this.frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    }

    // ==================== PLANS ====================

    async getPlans() {
        return this.prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async getPlanById(id: string) {
        const plan = await this.prisma.plan.findUnique({ where: { id } });
        if (!plan) {
            throw new NotFoundException('Plan not found');
        }
        return plan;
    }

    // ==================== SUBSCRIPTION MANAGEMENT ====================

    async getCurrentSubscription(companyId: string) {
        const subscription = await this.prisma.subscription.findFirst({
            where: { companyId },
            include: {
                plan: true,
                company: {
                    select: { name: true, email: true, stripeCustomerId: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!subscription) {
            throw new NotFoundException('No subscription found');
        }

        // Calculate days remaining
        const now = new Date();
        const endDate = subscription.currentPeriodEnd;
        const daysRemaining = Math.ceil(
            (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
            ...subscription,
            daysRemaining: Math.max(0, daysRemaining),
            isTrialing: subscription.status === SubscriptionStatus.TRIALING,
            isCanceling: subscription.cancelAtPeriodEnd,
        };
    }

    async createCheckoutSession(
        companyId: string,
        planId: string,
        billingInterval: 'monthly' | 'yearly',
    ) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });

        if (!company) {
            throw new NotFoundException('Company not found');
        }

        const plan = await this.prisma.plan.findUnique({
            where: { id: planId },
        });

        if (!plan) {
            throw new NotFoundException('Plan not found');
        }

        // Get or create Stripe customer
        let customerId = company.stripeCustomerId;

        if (!customerId) {
            const customer = await this.stripeService.createCustomer(
                company.email,
                company.name,
                { companyId: company.id },
            );

            customerId = customer.id;

            await this.prisma.company.update({
                where: { id: companyId },
                data: { stripeCustomerId: customerId },
            });
        }

        // Get the appropriate price ID
        const priceId = billingInterval === 'yearly'
            ? plan.stripePriceIdYearly
            : plan.stripePriceIdMonthly;

        if (!priceId) {
            throw new BadRequestException('Price not configured for this plan');
        }

        // Create checkout session
        const session = await this.stripeService.createCheckoutSession(
            customerId,
            priceId,
            `${this.frontendUrl}/dashboard/billing?success=true`,
            `${this.frontendUrl}/dashboard/billing?canceled=true`,
        );

        return {
            sessionId: session.id,
            url: session.url,
        };
    }

    async createBillingPortalSession(companyId: string) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });

        if (!company?.stripeCustomerId) {
            throw new BadRequestException('No billing account found');
        }

        const session = await this.stripeService.createBillingPortalSession(
            company.stripeCustomerId,
            `${this.frontendUrl}/dashboard/billing`,
        );

        return { url: session.url };
    }

    async changePlan(companyId: string, newPlanId: string, billingInterval: 'monthly' | 'yearly') {
        const subscription = await this.prisma.subscription.findFirst({
            where: { companyId, status: { in: ['ACTIVE', 'TRIALING'] } },
        });

        if (!subscription?.stripeSubscriptionId) {
            throw new BadRequestException('No active subscription to change');
        }

        const newPlan = await this.prisma.plan.findUnique({
            where: { id: newPlanId },
        });

        if (!newPlan) {
            throw new NotFoundException('Plan not found');
        }

        const priceId = billingInterval === 'yearly'
            ? newPlan.stripePriceIdYearly
            : newPlan.stripePriceIdMonthly;

        if (!priceId) {
            throw new BadRequestException('Price not configured');
        }

        await this.stripeService.changeSubscriptionPlan(
            subscription.stripeSubscriptionId,
            priceId,
        );

        await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: { planId: newPlanId },
        });

        this.logger.log(
            `Company ${companyId} changed plan to ${newPlan.name}`,
            'SubscriptionService',
        );

        return { message: 'Plan changed successfully' };
    }

    async cancelSubscription(companyId: string) {
        const subscription = await this.prisma.subscription.findFirst({
            where: { companyId, status: { in: ['ACTIVE', 'TRIALING'] } },
        });

        if (!subscription?.stripeSubscriptionId) {
            throw new BadRequestException('No active subscription to cancel');
        }

        await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);

        await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                cancelAtPeriodEnd: true,
                canceledAt: new Date(),
            },
        });

        this.logger.log(`Company ${companyId} canceled subscription`, 'SubscriptionService');

        return { message: 'Subscription will be canceled at the end of the billing period' };
    }

    async resumeSubscription(companyId: string) {
        const subscription = await this.prisma.subscription.findFirst({
            where: { companyId, cancelAtPeriodEnd: true },
        });

        if (!subscription?.stripeSubscriptionId) {
            throw new BadRequestException('No subscription to resume');
        }

        await this.stripeService.resumeSubscription(subscription.stripeSubscriptionId);

        await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                cancelAtPeriodEnd: false,
                canceledAt: null,
            },
        });

        return { message: 'Subscription resumed' };
    }

    // ==================== BILLING HISTORY ====================

    async getInvoices(companyId: string) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });

        if (!company?.stripeCustomerId) {
            return { invoices: [] };
        }

        const stripeInvoices = await this.stripeService.getInvoices(
            company.stripeCustomerId,
            20,
        );

        return {
            invoices: stripeInvoices.data.map((inv) => ({
                id: inv.id,
                number: inv.number,
                amount: inv.amount_paid / 100,
                currency: inv.currency,
                status: inv.status,
                date: new Date(inv.created * 1000),
                pdfUrl: inv.invoice_pdf,
                hostedUrl: inv.hosted_invoice_url,
            })),
        };
    }

    async getPaymentHistory(companyId: string) {
        return this.prisma.payment.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }

    // ==================== USAGE & LIMITS ====================

    async checkFeatureAccess(companyId: string, feature: string): Promise<boolean> {
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                companyId,
                status: { in: ['ACTIVE', 'TRIALING'] },
            },
            include: { plan: true },
        });

        if (!subscription) {
            return false;
        }

        const plan = subscription.plan;

        switch (feature) {
            case 'gps_tracking':
                return plan.hasGpsTracking;
            case 'shift_management':
                return plan.hasShiftManagement;
            case 'advanced_reports':
                return plan.hasAdvancedReports;
            case 'api_access':
                return plan.hasApiAccess;
            case 'white_label':
                return plan.hasWhiteLabel;
            case 'custom_integrations':
                return plan.hasCustomIntegrations;
            default:
                return true;
        }
    }

    async checkEmployeeLimit(companyId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                companyId,
                status: { in: ['ACTIVE', 'TRIALING'] },
            },
            include: { plan: true },
        });

        if (!subscription) {
            return { allowed: false, current: 0, limit: 0 };
        }

        const currentEmployees = await this.prisma.employee.count({
            where: { companyId, isActive: true },
        });

        const limit = subscription.plan.maxEmployees;

        return {
            allowed: currentEmployees < limit,
            current: currentEmployees,
            limit,
        };
    }

    // ==================== WEBHOOK HANDLERS ====================

    async handleSubscriptionCreated(stripeSubscription: any) {
        const customerId = stripeSubscription.customer;

        const company = await this.prisma.company.findFirst({
            where: { stripeCustomerId: customerId },
        });

        if (!company) {
            this.logger.warn(
                `Company not found for Stripe customer ${customerId}`,
                'SubscriptionService',
            );
            return;
        }

        // Find plan by price ID
        const priceId = stripeSubscription.items.data[0]?.price?.id;
        const plan = await this.prisma.plan.findFirst({
            where: {
                OR: [
                    { stripePriceIdMonthly: priceId },
                    { stripePriceIdYearly: priceId },
                ],
            },
        });

        if (!plan) {
            this.logger.warn(`Plan not found for price ${priceId}`, 'SubscriptionService');
            return;
        }

        await this.prisma.subscription.upsert({
            where: {
                companyId_planId: {
                    companyId: company.id,
                    planId: plan.id,
                },
            },
            create: {
                companyId: company.id,
                planId: plan.id,
                stripeSubscriptionId: stripeSubscription.id,
                status: this.mapStripeStatus(stripeSubscription.status),
                currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                trialEnd: stripeSubscription.trial_end
                    ? new Date(stripeSubscription.trial_end * 1000)
                    : null,
            },
            update: {
                stripeSubscriptionId: stripeSubscription.id,
                status: this.mapStripeStatus(stripeSubscription.status),
                currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            },
        });

        this.logger.log(
            `Subscription created/updated for company ${company.id}`,
            'SubscriptionService',
        );
    }

    async handleSubscriptionUpdated(stripeSubscription: any) {
        await this.handleSubscriptionCreated(stripeSubscription);
    }

    async handleSubscriptionDeleted(stripeSubscription: any) {
        const subscription = await this.prisma.subscription.findFirst({
            where: { stripeSubscriptionId: stripeSubscription.id },
        });

        if (subscription) {
            await this.prisma.subscription.update({
                where: { id: subscription.id },
                data: { status: SubscriptionStatus.CANCELED },
            });

            this.logger.log(
                `Subscription ${subscription.id} canceled`,
                'SubscriptionService',
            );
        }
    }

    async handleInvoicePaid(invoice: any) {
        const customerId = invoice.customer;

        const company = await this.prisma.company.findFirst({
            where: { stripeCustomerId: customerId },
        });

        if (!company) return;

        await this.prisma.payment.create({
            data: {
                companyId: company.id,
                stripeInvoiceId: invoice.id,
                stripePaymentIntentId: invoice.payment_intent,
                amount: invoice.amount_paid / 100,
                currency: invoice.currency,
                status: 'SUCCEEDED',
                invoiceUrl: invoice.hosted_invoice_url,
                invoicePdf: invoice.invoice_pdf,
                paidAt: new Date(invoice.status_transitions?.paid_at * 1000 || Date.now()),
            },
        });

        this.logger.log(`Payment recorded for company ${company.id}`, 'SubscriptionService');
    }

    async handleInvoicePaymentFailed(invoice: any) {
        const customerId = invoice.customer;

        const company = await this.prisma.company.findFirst({
            where: { stripeCustomerId: customerId },
        });

        if (!company) return;

        await this.prisma.payment.create({
            data: {
                companyId: company.id,
                stripeInvoiceId: invoice.id,
                amount: invoice.amount_due / 100,
                currency: invoice.currency,
                status: 'FAILED',
            },
        });

        // Update subscription status
        await this.prisma.subscription.updateMany({
            where: { companyId: company.id },
            data: { status: SubscriptionStatus.PAST_DUE },
        });

        // TODO: Send payment failed notification email

        this.logger.warn(
            `Payment failed for company ${company.id}`,
            'SubscriptionService',
        );
    }

    private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
        switch (stripeStatus) {
            case 'trialing':
                return SubscriptionStatus.TRIALING;
            case 'active':
                return SubscriptionStatus.ACTIVE;
            case 'past_due':
                return SubscriptionStatus.PAST_DUE;
            case 'canceled':
                return SubscriptionStatus.CANCELED;
            case 'unpaid':
                return SubscriptionStatus.UNPAID;
            case 'paused':
                return SubscriptionStatus.PAUSED;
            default:
                return SubscriptionStatus.ACTIVE;
        }
    }
}
