import {
    IsString,
    IsEmail,
    IsOptional,
    IsISO8601,
    IsUUID,
    IsBoolean,
    IsEnum,
    MinLength,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateEmployeeDto {
    @ApiProperty({ example: 'EMP001' })
    @IsString()
    @MinLength(2)
    @MaxLength(20)
    employeeCode: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    lastName: string;

    @ApiProperty({ example: 'john.doe@company.com' })
    @IsEmail()
    email: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ example: '1990-01-15' })
    @IsOptional()
    @IsISO8601()
    dateOfBirth?: string;

    @ApiPropertyOptional({ enum: ['M', 'F', 'O'] })
    @IsOptional()
    @IsString()
    gender?: string;

    @ApiProperty({ example: '2024-01-01' })
    @IsISO8601()
    dateOfJoining: string;

    @ApiPropertyOptional({ enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'] })
    @IsOptional()
    @IsString()
    employmentType?: string;

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

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    managerId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    city?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    state?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    postalCode?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    emergencyContactName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    emergencyContactPhone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    emergencyContactRelation?: string;

    @ApiPropertyOptional({ description: 'Create a user account for this employee' })
    @IsOptional()
    @IsBoolean()
    createUserAccount?: boolean;

    @ApiPropertyOptional({ enum: UserRole, description: 'User role if creating account' })
    @IsOptional()
    @IsEnum(UserRole)
    userRole?: UserRole;
}
