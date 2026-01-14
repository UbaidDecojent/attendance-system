import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfficeLocationDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsNumber()
    latitude: number;

    @ApiProperty()
    @IsNumber()
    longitude: number;

    @ApiProperty()
    @IsNumber()
    radius: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    address?: string;
}

export class UpdateOfficeLocationDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    latitude?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    longitude?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    radius?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
