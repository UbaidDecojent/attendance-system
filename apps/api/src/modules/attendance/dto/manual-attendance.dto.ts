import {
    IsString,
    IsOptional,
    IsEnum,
    IsISO8601,
    IsUUID,
    IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus, AttendanceType } from '@prisma/client';

export class ManualAttendanceDto {
    @ApiProperty()
    @IsUUID()
    employeeId: string;

    @ApiProperty({ example: '2026-01-06' })
    @IsISO8601()
    date: string;

    @ApiPropertyOptional({ example: '2026-01-06T09:00:00Z' })
    @IsOptional()
    @IsISO8601()
    checkInTime?: string;

    @ApiPropertyOptional({ example: '2026-01-06T18:00:00Z' })
    @IsOptional()
    @IsISO8601()
    checkOutTime?: string;

    @ApiPropertyOptional({ enum: AttendanceStatus })
    @IsOptional()
    @IsEnum(AttendanceStatus)
    status?: AttendanceStatus;

    @ApiPropertyOptional({ enum: AttendanceType })
    @IsOptional()
    @IsEnum(AttendanceType)
    type?: AttendanceType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    lateMinutes?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    overtimeMinutes?: number;

    @ApiProperty({ description: 'Reason for manual entry' })
    @IsString()
    reason: string;
}
