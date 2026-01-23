import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
    @ApiProperty({ example: 'Website Redesign' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 'Client inc', required: false })
    @IsString()
    @IsOptional()
    clientName?: string;

    @ApiProperty({ example: 'Redesigning the corporate website', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'uuid-of-employee' })
    @IsUUID()
    @IsNotEmpty()
    ownerId: string;
}
