import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LeaveActionDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    note?: string;

    @ApiPropertyOptional({ description: 'Required for rejection' })
    @IsOptional()
    @IsString()
    reason?: string;
}
