import { IsString, IsUUID, IsISO8601, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaveDto {
    @ApiProperty()
    @IsUUID()
    leaveTypeId: string;

    @ApiProperty({ example: '2026-01-10' })
    @IsISO8601()
    startDate: string;

    @ApiProperty({ example: '2026-01-12' })
    @IsISO8601()
    endDate: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isHalfDay?: boolean;

    @ApiPropertyOptional({ enum: ['FIRST_HALF', 'SECOND_HALF'] })
    @IsOptional()
    @IsString()
    halfDayType?: string;

    @ApiProperty()
    @IsString()
    reason: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    documentUrl?: string;
}
