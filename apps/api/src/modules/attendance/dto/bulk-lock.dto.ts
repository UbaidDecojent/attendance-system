import { IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkLockDto {
    @ApiProperty({ example: '2026-01-01' })
    @IsISO8601()
    startDate: string;

    @ApiProperty({ example: '2026-01-31' })
    @IsISO8601()
    endDate: string;
}
