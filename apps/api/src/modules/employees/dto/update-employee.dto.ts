import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';
import { IsOptional, IsISO8601 } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmployeeDto extends PartialType(
    OmitType(CreateEmployeeDto, ['createUserAccount', 'userRole'] as const),
) {
    @ApiPropertyOptional()
    @IsOptional()
    @IsISO8601()
    dateOfLeaving?: string;
}
