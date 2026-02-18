import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingType, ProjectType } from '@prisma/client';

export class CreateDailyUpdateDto {
    @ApiProperty({ description: 'Project ID' })
    @IsString()
    projectId: string;

    @ApiProperty({ description: 'Task ID' })
    @IsString()
    taskId: string;

    @ApiProperty({ description: 'Hours worked on this task today', minimum: 0.5, maximum: 24 })
    @IsNumber()
    @Min(0.5)
    @Max(24)
    hoursWorked: number;

    @ApiPropertyOptional({ description: 'Deadline for this task' })
    @IsOptional()
    @IsDateString()
    deadline?: string;

    @ApiProperty({ enum: BillingType, description: 'Billing type' })
    @IsEnum(BillingType)
    billingType: BillingType;

    @ApiProperty({ enum: ProjectType, description: 'Project type (CLIENT or IN_HOUSE)' })
    @IsEnum(ProjectType)
    projectType: ProjectType;

    @ApiPropertyOptional({ description: 'Optional notes' })
    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdateDailyUpdateDto {
    @ApiPropertyOptional({ description: 'Hours worked' })
    @IsOptional()
    @IsNumber()
    @Min(0.5)
    @Max(24)
    hoursWorked?: number;

    @ApiPropertyOptional({ description: 'Deadline' })
    @IsOptional()
    @IsDateString()
    deadline?: string;

    @ApiPropertyOptional({ enum: BillingType })
    @IsOptional()
    @IsEnum(BillingType)
    billingType?: BillingType;

    @ApiPropertyOptional({ enum: ProjectType })
    @IsOptional()
    @IsEnum(ProjectType)
    projectType?: ProjectType;

    @ApiPropertyOptional({ description: 'Notes' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ description: 'Status', enum: ['IN_PROGRESS', 'COMPLETED'] })
    @IsOptional()
    @IsString()
    status?: 'IN_PROGRESS' | 'COMPLETED';
}
