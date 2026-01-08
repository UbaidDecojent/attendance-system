import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshTokenDto {
    @ApiPropertyOptional({ description: 'Refresh token (if not using cookies)' })
    @IsOptional()
    @IsString()
    refreshToken?: string;
}
