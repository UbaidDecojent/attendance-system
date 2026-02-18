import { IsUUID, IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLeaveBalanceDto {
    @ApiProperty()
    @IsUUID()
    leaveTypeId: string;

    @ApiProperty({ description: 'Positive to add, negative to deduct' })
    @IsNumber()
    adjustment: number;

    @ApiProperty()
    @IsOptional()
    @IsString()
    reason?: string;
}
