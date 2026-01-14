import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRegularizationDto {
    @ApiProperty()
    @IsDateString()
    date: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    checkInTime?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    checkOutTime?: string;

    @ApiProperty()
    @IsString()
    reason: string;
}
