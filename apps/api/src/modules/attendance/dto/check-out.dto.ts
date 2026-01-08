import { IsOptional, IsString, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class LocationDto {
    lat: number;
    lng: number;
    address?: string;
}

export class CheckOutDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    location?: LocationDto;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    note?: string;

    // These are set by the controller
    ipAddress?: string;
    deviceInfo?: string;
}
