import { IsString, IsNotEmpty, IsOptional, IsEnum, Matches } from 'class-validator';
import { BillingType } from '@prisma/client';

export class CreateTimeLogDto {
    @IsString()
    @IsNotEmpty()
    projectId: string;

    @IsString()
    @IsNotEmpty()
    taskId: string;

    @IsString()
    @IsNotEmpty()
    date: string; // YYYY-MM-DD or ISO

    @IsString()
    @IsNotEmpty()
    @Matches(/^(\d{1,2}):(\d{2})$/, { message: 'Duration must be in HH:MM format' })
    duration: string;

    @IsEnum(BillingType)
    billingType: BillingType;

    @IsString()
    @IsOptional()
    description?: string;
}
