import { IsOptional, IsUUID, IsISO8601, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LeaveStatus } from '@prisma/client';

export class LeaveQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    employeeId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    departmentId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    leaveTypeId?: string;

    @ApiPropertyOptional({ enum: LeaveStatus })
    @IsOptional()
    @IsEnum(LeaveStatus)
    status?: LeaveStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsISO8601()
    startDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsISO8601()
    endDate?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}
