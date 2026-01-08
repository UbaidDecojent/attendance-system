import { IsOptional, IsEnum, IsISO8601, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    employeeId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    departmentId?: string;

    @ApiPropertyOptional({ example: '2026-01-01' })
    @IsOptional()
    @IsISO8601()
    startDate?: string;

    @ApiPropertyOptional({ example: '2026-01-31' })
    @IsOptional()
    @IsISO8601()
    endDate?: string;

    @ApiPropertyOptional({ enum: AttendanceStatus })
    @IsOptional()
    @IsEnum(AttendanceStatus)
    status?: AttendanceStatus;

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
