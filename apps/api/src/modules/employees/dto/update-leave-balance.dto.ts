import { IsUUID, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLeaveBalanceDto {
    @ApiProperty()
    @IsUUID()
    leaveTypeId: string;

    @ApiProperty({ description: 'Positive to add, negative to deduct' })
    @IsNumber()
    adjustment: number;

    @ApiProperty()
    @IsString()
    reason: string;
}
