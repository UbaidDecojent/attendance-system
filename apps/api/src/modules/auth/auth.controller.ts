import {
    Controller,
    Post,
    Body,
    Get,
    Req,
    Res,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Verify2FADto, Verify2FALoginDto } from './dto/two-factor.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // ==================== REGISTRATION ====================

    @Post('register')
    @Public()
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: 'Register a new company and admin user' })
    @ApiResponse({ status: 201, description: 'Registration successful' })
    @ApiResponse({ status: 409, description: 'Email or company already exists' })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    // ==================== LOGIN ====================

    @Post('login')
    @Public()
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(
        @Body() dto: LoginDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const ipAddress = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.get('user-agent') || '';

        const result = await this.authService.login(dto, ipAddress, userAgent);

        // If 2FA is required, return temporary token
        if ('requires2FA' in result && result.requires2FA) {
            return result;
        }

        // Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', (result as any).refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Don't send refresh token in response body
        const { refreshToken, ...response } = result as any;
        return response;
    }

    @Post('login/2fa')
    @Public()
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: 'Complete login with 2FA code' })
    async login2FA(
        @Body() dto: Verify2FALoginDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const ipAddress = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.get('user-agent') || '';

        const result = await this.authService.verify2FALogin(
            dto.tempToken,
            dto.code,
            ipAddress,
            userAgent,
        );

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const { refreshToken, ...response } = result;
        return response;
    }

    // ==================== TOKEN REFRESH ====================

    @Post('refresh')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    async refresh(
        @Body() dto: RefreshTokenDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        // Get refresh token from cookie or body
        const refreshToken = req.cookies?.refreshToken || dto.refreshToken;

        if (!refreshToken) {
            throw new Error('Refresh token required');
        }

        const ipAddress = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.get('user-agent') || '';

        const result = await this.authService.refreshTokens(refreshToken, ipAddress, userAgent);

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const { refreshToken: newRefreshToken, ...response } = result;
        return response;
    }

    // ==================== LOGOUT ====================

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Logout user' })
    async logout(
        @CurrentUser() user: any,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = req.cookies?.refreshToken;

        await this.authService.logout(user.id, refreshToken);

        res.clearCookie('refreshToken');

        return { message: 'Logged out successfully' };
    }

    @Post('logout/all')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Logout from all devices' })
    async logoutAll(
        @CurrentUser() user: any,
        @Res({ passthrough: true }) res: Response,
    ) {
        await this.authService.logout(user.id);
        res.clearCookie('refreshToken');

        return { message: 'Logged out from all devices' };
    }

    // ==================== EMAIL VERIFICATION ====================

    @Post('verify-email')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify email with token' })
    async verifyEmail(@Body() dto: VerifyEmailDto) {
        return this.authService.verifyEmail(dto);
    }

    @Post('resend-verification')
    @Public()
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Resend verification email' })
    async resendVerification(@Body('email') email: string) {
        return this.authService.resendVerification(email);
    }

    // ==================== PASSWORD RESET ====================

    @Post('forgot-password')
    @Public()
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request password reset email' })
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    @Post('reset-password')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password with token' })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    // ==================== 2FA ====================

    @Post('2fa/enable')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Enable two-factor authentication' })
    async enable2FA(@CurrentUser() user: any) {
        return this.authService.enable2FA(user.id);
    }

    @Post('2fa/confirm')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Confirm and activate 2FA' })
    async confirm2FA(@CurrentUser() user: any, @Body() dto: Verify2FADto) {
        return this.authService.confirm2FA(user.id, dto);
    }

    @Post('2fa/disable')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Disable two-factor authentication' })
    async disable2FA(@CurrentUser() user: any, @Body() dto: Verify2FADto) {
        return this.authService.disable2FA(user.id, dto);
    }

    // ==================== CURRENT USER ====================

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get current user info' })
    async getMe(@CurrentUser() user: any) {
        return { user };
    }
}
