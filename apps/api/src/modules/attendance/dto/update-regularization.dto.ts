import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RegularizationStatus {
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

export class UpdateRegularizationDto {
    @ApiProperty({ enum: RegularizationStatus })
    @IsEnum(RegularizationStatus)
    status: RegularizationStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    rejectionReason?: string;
}
