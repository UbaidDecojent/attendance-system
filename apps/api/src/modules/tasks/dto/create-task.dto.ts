import { IsString, IsOptional, IsEnum, IsDateString, IsArray, IsUUID, IsNotEmpty } from 'class-validator';
import { TaskStatus, TaskPriority, BillingType } from '@prisma/client';

export class CreateTaskDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsUUID()
    @IsNotEmpty()
    projectId: string;

    @IsArray()
    @IsUUID(4, { each: true })
    assigneeIds: string[];

    @IsEnum(TaskStatus)
    @IsOptional()
    status?: TaskStatus;

    @IsEnum(TaskPriority)
    @IsOptional()
    priority?: TaskPriority;

    @IsEnum(BillingType)
    @IsOptional()
    billingType?: BillingType;

    @IsDateString()
    @IsOptional()
    startDate?: string;

    @IsDateString()
    @IsOptional()
    dueDate?: string;

    @IsString()
    @IsOptional()
    duration?: string;
}
