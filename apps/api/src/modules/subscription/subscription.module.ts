import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';

@Module({
    controllers: [SubscriptionController],
    providers: [SubscriptionService, StripeService],
    exports: [SubscriptionService, StripeService],
})
export class SubscriptionModule { }
