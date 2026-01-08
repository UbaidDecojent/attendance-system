import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
    @ApiPropertyOptional({ example: 'America/New_York' })
    @IsOptional()
    @IsString()
    timezone?: string;

    @ApiPropertyOptional({ example: 'YYYY-MM-DD' })
    @IsOptional()
    @IsString()
    dateFormat?: string;

    @ApiPropertyOptional({ example: 'HH:mm' })
    @IsOptional()
    @IsString()
    timeFormat?: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(6)
    weekStartDay?: number;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(12)
    fiscalYearStart?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    allowRemoteAttendance?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    requireGpsTracking?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    allowIpRestriction?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    allowedIps?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    autoCheckoutEnabled?: boolean;

    @ApiPropertyOptional({ example: '18:00' })
    @IsOptional()
    @IsString()
    autoCheckoutTime?: string;

    @ApiPropertyOptional({ example: 480 })
    @IsOptional()
    @IsNumber()
    overtimeThresholdMinutes?: number;

    @ApiPropertyOptional({ example: 15 })
    @IsOptional()
    @IsNumber()
    graceTimeMinutes?: number;
}
