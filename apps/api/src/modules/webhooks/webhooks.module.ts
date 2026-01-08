import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
    imports: [SubscriptionModule],
    controllers: [WebhooksController],
})
export class WebhooksModule { }
