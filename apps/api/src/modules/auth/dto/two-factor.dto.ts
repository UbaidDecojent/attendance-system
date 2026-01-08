import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto { }

export class Verify2FADto {
    @ApiProperty({ example: '123456', description: '6-digit verification code' })
    @IsString()
    @Length(6, 6, { message: 'Code must be exactly 6 digits' })
    code: string;
}

export class Verify2FALoginDto {
    @ApiProperty({ description: 'Temporary token from login response' })
    @IsString()
    tempToken: string;

    @ApiProperty({ example: '123456', description: '6-digit verification code' })
    @IsString()
    @Length(6, 6, { message: 'Code must be exactly 6 digits' })
    code: string;
}
