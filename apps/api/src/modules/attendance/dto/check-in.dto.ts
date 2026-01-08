import { IsOptional, IsString, IsEnum, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceType, WorkLocationType } from '@prisma/client';

class LocationDto {
    lat: number;
    lng: number;
    address?: string;
}

export class CheckInDto {
    @ApiPropertyOptional({ enum: AttendanceType })
    @IsOptional()
    @IsEnum(AttendanceType)
    type?: AttendanceType;

    @ApiPropertyOptional({ enum: WorkLocationType })
    @IsOptional()
    @IsEnum(WorkLocationType)
    workLocation?: WorkLocationType;

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
