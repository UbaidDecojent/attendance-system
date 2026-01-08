import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { WinstonLoggerService } from '../../common/services/logger.service';

@Injectable()
export class StripeService {
    private stripe: Stripe;

    constructor(
        private configService: ConfigService,
        private logger: WinstonLoggerService,
    ) {
        const secretKey = configService.get<string>('STRIPE_SECRET_KEY');

        if (!secretKey) {
            this.logger.warn('Stripe secret key not configured', 'StripeService');
        }

        this.stripe = new Stripe(secretKey || 'sk_test_placeholder', {
            apiVersion: '2023-10-16',
        });
    }

    // ==================== CUSTOMERS ====================

    async createCustomer(email: string, name: string, metadata?: Record<string, string>) {
        return this.stripe.customers.create({
            email,
            name,
            metadata,
        });
    }

    async getCustomer(customerId: string) {
        return this.stripe.customers.retrieve(customerId);
    }

    async updateCustomer(customerId: string, data: Stripe.CustomerUpdateParams) {
        return this.stripe.customers.update(customerId, data);
    }

    // ==================== SUBSCRIPTIONS ====================

    async createSubscription(
        customerId: string,
        priceId: string,
        trialDays?: number,
    ) {
        const params: Stripe.SubscriptionCreateParams = {
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
        };

        if (trialDays) {
            params.trial_period_days = trialDays;
        }

        return this.stripe.subscriptions.create(params);
    }

    async getSubscription(subscriptionId: string) {
        return this.stripe.subscriptions.retrieve(subscriptionId);
    }

    async updateSubscription(
        subscriptionId: string,
        data: Stripe.SubscriptionUpdateParams,
    ) {
        return this.stripe.subscriptions.update(subscriptionId, data);
    }

    async cancelSubscription(subscriptionId: string, immediately = false) {
        if (immediately) {
            return this.stripe.subscriptions.cancel(subscriptionId);
        }

        return this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });
    }

    async resumeSubscription(subscriptionId: string) {
        return this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        });
    }

    async changeSubscriptionPlan(subscriptionId: string, newPriceId: string) {
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

        return this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
            proration_behavior: 'create_prorations',
            items: [
                {
                    id: subscription.items.data[0].id,
                    price: newPriceId,
                },
            ],
        });
    }

    // ==================== CHECKOUT ====================

    async createCheckoutSession(
        customerId: string,
        priceId: string,
        successUrl: string,
        cancelUrl: string,
        trialDays?: number,
    ) {
        const params: Stripe.Checkout.SessionCreateParams = {
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            subscription_data: {},
        };

        if (trialDays && params.subscription_data) {
            params.subscription_data.trial_period_days = trialDays;
        }

        return this.stripe.checkout.sessions.create(params);
    }

    // ==================== BILLING PORTAL ====================

    async createBillingPortalSession(customerId: string, returnUrl: string) {
        return this.stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });
    }

    // ==================== INVOICES ====================

    async getInvoices(customerId: string, limit = 10) {
        return this.stripe.invoices.list({
            customer: customerId,
            limit,
        });
    }

    async getInvoice(invoiceId: string) {
        return this.stripe.invoices.retrieve(invoiceId);
    }

    async getUpcomingInvoice(customerId: string) {
        return this.stripe.invoices.retrieveUpcoming({
            customer: customerId,
        });
    }

    // ==================== PAYMENT METHODS ====================

    async getPaymentMethods(customerId: string) {
        return this.stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });
    }

    async setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
        return this.stripe.customers.update(customerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });
    }

    // ==================== WEBHOOKS ====================

    constructWebhookEvent(payload: Buffer, signature: string) {
        const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

        if (!webhookSecret) {
            throw new Error('Stripe webhook secret not configured');
        }

        return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }

    // ==================== PRICES ====================

    async getPrices() {
        return this.stripe.prices.list({
            active: true,
            expand: ['data.product'],
        });
    }

    async getPrice(priceId: string) {
        return this.stripe.prices.retrieve(priceId);
    }
}
