import { IsOptional, IsString, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class EmployeeQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    departmentId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    designationId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    shiftId?: string;

    @ApiPropertyOptional({ enum: ['active', 'inactive', 'all'] })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'] })
    @IsOptional()
    @IsString()
    employmentType?: string;

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
    @Max(1000)
    limit?: number = 20;
}
