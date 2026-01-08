import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    UseGuards,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CheckoutDto } from './dto/checkout.dto';
import { ChangePlanDto } from './dto/change-plan.dto';

@ApiTags('Subscription')
@Controller('subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) { }

    @Get('plans')
    @ApiOperation({ summary: 'Get all available plans' })
    async getPlans() {
        return this.subscriptionService.getPlans();
    }

    @Get()
    @ApiOperation({ summary: 'Get current subscription' })
    async getCurrentSubscription(@CurrentUser() user: any) {
        return this.subscriptionService.getCurrentSubscription(user.companyId);
    }

    @Post('checkout')
    @Roles(UserRole.COMPANY_ADMIN)
    @ApiOperation({ summary: 'Create Stripe checkout session' })
    async createCheckout(
        @CurrentUser() user: any,
        @Body() dto: CheckoutDto,
    ) {
        return this.subscriptionService.createCheckoutSession(
            user.companyId,
            dto.planId,
            dto.billingInterval,
        );
    }

    @Post('portal')
    @Roles(UserRole.COMPANY_ADMIN)
    @ApiOperation({ summary: 'Create Stripe billing portal session' })
    async createPortal(@CurrentUser() user: any) {
        return this.subscriptionService.createBillingPortalSession(user.companyId);
    }

    @Put('change')
    @Roles(UserRole.COMPANY_ADMIN)
    @ApiOperation({ summary: 'Change subscription plan' })
    async changePlan(
        @CurrentUser() user: any,
        @Body() dto: ChangePlanDto,
    ) {
        return this.subscriptionService.changePlan(
            user.companyId,
            dto.planId,
            dto.billingInterval,
        );
    }

    @Post('cancel')
    @Roles(UserRole.COMPANY_ADMIN)
    @ApiOperation({ summary: 'Cancel subscription' })
    async cancel(@CurrentUser() user: any) {
        return this.subscriptionService.cancelSubscription(user.companyId);
    }

    @Post('resume')
    @Roles(UserRole.COMPANY_ADMIN)
    @ApiOperation({ summary: 'Resume canceled subscription' })
    async resume(@CurrentUser() user: any) {
        return this.subscriptionService.resumeSubscription(user.companyId);
    }

    @Get('invoices')
    @Roles(UserRole.COMPANY_ADMIN)
    @ApiOperation({ summary: 'Get invoices from Stripe' })
    async getInvoices(@CurrentUser() user: any) {
        return this.subscriptionService.getInvoices(user.companyId);
    }

    @Get('payments')
    @Roles(UserRole.COMPANY_ADMIN)
    @ApiOperation({ summary: 'Get payment history' })
    async getPayments(@CurrentUser() user: any) {
        return this.subscriptionService.getPaymentHistory(user.companyId);
    }

    @Get('limits')
    @ApiOperation({ summary: 'Get current usage and limits' })
    async getLimits(@CurrentUser() user: any) {
        const employeeLimit = await this.subscriptionService.checkEmployeeLimit(
            user.companyId,
        );

        return {
            employees: employeeLimit,
        };
    }

    @Get('feature')
    @ApiOperation({ summary: 'Check if feature is available' })
    @ApiQuery({ name: 'name', example: 'gps_tracking' })
    async checkFeature(
        @CurrentUser() user: any,
        @Query('name') featureName: string,
    ) {
        const hasAccess = await this.subscriptionService.checkFeatureAccess(
            user.companyId,
            featureName,
        );

        return { feature: featureName, hasAccess };
    }
}
