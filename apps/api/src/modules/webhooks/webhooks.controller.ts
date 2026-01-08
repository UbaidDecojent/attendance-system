import { Controller, Post, Req, Res, Headers, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { StripeService } from '../subscription/stripe.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { WinstonLoggerService } from '../../common/services/logger.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
    constructor(
        private stripeService: StripeService,
        private subscriptionService: SubscriptionService,
        private logger: WinstonLoggerService,
    ) { }

    @Post('stripe')
    @ApiExcludeEndpoint()
    async handleStripeWebhook(
        @Req() req: Request,
        @Res() res: Response,
        @Headers('stripe-signature') signature: string,
    ) {
        if (!signature) {
            return res.status(HttpStatus.BAD_REQUEST).send('Missing signature');
        }

        let event;

        try {
            event = this.stripeService.constructWebhookEvent(
                req.body,
                signature,
            );
        } catch (err) {
            this.logger.error(`Webhook signature verification failed: ${err.message}`, err.stack, 'WebhooksController');
            return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
        }

        this.logger.log(`Stripe webhook received: ${event.type}`, 'WebhooksController');

        try {
            switch (event.type) {
                case 'customer.subscription.created':
                    await this.subscriptionService.handleSubscriptionCreated(event.data.object);
                    break;

                case 'customer.subscription.updated':
                    await this.subscriptionService.handleSubscriptionUpdated(event.data.object);
                    break;

                case 'customer.subscription.deleted':
                    await this.subscriptionService.handleSubscriptionDeleted(event.data.object);
                    break;

                case 'invoice.paid':
                    await this.subscriptionService.handleInvoicePaid(event.data.object);
                    break;

                case 'invoice.payment_failed':
                    await this.subscriptionService.handleInvoicePaymentFailed(event.data.object);
                    break;

                default:
                    this.logger.log(`Unhandled event type: ${event.type}`, 'WebhooksController');
            }

            return res.status(HttpStatus.OK).json({ received: true });
        } catch (err) {
            this.logger.error(`Webhook handler error: ${err.message}`, err.stack, 'WebhooksController');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Webhook handler error');
        }
    }
}
