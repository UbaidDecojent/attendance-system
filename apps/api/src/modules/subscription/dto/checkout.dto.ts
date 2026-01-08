import { IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutDto {
    @ApiProperty()
    @IsUUID()
    planId: string;

    @ApiProperty({ enum: ['monthly', 'yearly'] })
    @IsEnum(['monthly', 'yearly'])
    billingInterval: 'monthly' | 'yearly';
}
