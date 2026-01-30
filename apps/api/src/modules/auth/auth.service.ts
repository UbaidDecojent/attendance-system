import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { addMinutes, addDays, isBefore } from 'date-fns';

import { PrismaService } from '../../common/prisma/prisma.service';
import { WinstonLoggerService } from '../../common/services/logger.service';
import { EmailService } from './services/email.service';
import { TwoFactorService } from './services/two-factor.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Enable2FADto, Verify2FADto } from './dto/two-factor.dto';

export interface TokenPayload {
    sub: string;
    email: string;
    role: string;
    companyId?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private emailService: EmailService,
        private twoFactorService: TwoFactorService,
        private logger: WinstonLoggerService,
    ) { }

    // ==================== REGISTRATION ====================

    async register(dto: RegisterDto) {
        // Check if email exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });

        if (existingUser) {
            throw new ConflictException('Email already in use');
        }

        // Check if company slug exists
        const slug = this.generateSlug(dto.companyName);
        const existingCompany = await this.prisma.company.findUnique({
            where: { slug },
        });

        if (existingCompany) {
            throw new ConflictException('Company name already registered');
        }

        // Hash password
        const saltRounds = parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS') || '12', 10);
        const passwordHash = await bcrypt.hash(dto.password, saltRounds);

        // Generate verification token
        const emailVerificationToken = uuidv4();
        const emailVerificationExpires = addDays(new Date(), 1);

        // Get default plan (Starter)
        const defaultPlan = await this.prisma.plan.findFirst({
            where: { name: 'Starter', isActive: true },
        });

        // Create company and admin user in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Create company
            const company = await tx.company.create({
                data: {
                    name: dto.companyName,
                    slug,
                    email: dto.email.toLowerCase(),
                    phone: dto.phone,
                    country: dto.country || 'US',
                    timezone: dto.timezone || 'UTC',
                },
            });

            // Create admin user
            const user = await tx.user.create({
                data: {
                    companyId: company.id,
                    email: dto.email.toLowerCase(),
                    passwordHash,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    phone: dto.phone,
                    role: 'COMPANY_ADMIN',
                    status: 'PENDING_VERIFICATION',
                    emailVerificationToken,
                    emailVerificationExpires,
                },
            });

            // Create trial subscription if plan exists
            if (defaultPlan) {
                const trialDays = this.configService.get<number>('TRIAL_PERIOD_DAYS') || 14;
                const now = new Date();
                const trialEnd = addDays(now, trialDays);

                await tx.subscription.create({
                    data: {
                        companyId: company.id,
                        planId: defaultPlan.id,
                        status: 'TRIALING',
                        currentPeriodStart: now,
                        currentPeriodEnd: trialEnd,
                        trialEnd,
                    },
                });
            }

            // Create default leave types
            await this.createDefaultLeaveTypes(tx, company.id);

            // Create default shift
            await tx.shift.create({
                data: {
                    companyId: company.id,
                    name: 'General Shift',
                    code: 'GENERAL',
                    startTime: '09:00',
                    endTime: '18:00',
                    breakDuration: 60,
                    isDefault: true,
                },
            });

            return { company, user };
        });

        // Send verification email
        await this.emailService.sendVerificationEmail(
            result.user.email,
            result.user.firstName,
            emailVerificationToken,
        );

        this.logger.log(
            `New company registered: ${result.company.name} (${result.company.id})`,
            'AuthService',
        );

        return {
            message: 'Registration successful. Please verify your email.',
            companyId: result.company.id,
        };
    }

    // ==================== LOGIN ====================

    async login(dto: LoginDto, ipAddress: string, userAgent: string) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                    },
                },
                employee: {
                    select: {
                        id: true,
                        departmentId: true,
                        designationId: true,
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if account is locked
        if (user.lockedUntil && isBefore(new Date(), user.lockedUntil)) {
            const minutesLeft = Math.ceil(
                (user.lockedUntil.getTime() - Date.now()) / 60000,
            );
            throw new ForbiddenException(
                `Account locked. Try again in ${minutesLeft} minutes.`,
            );
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

        if (!isPasswordValid) {
            // Increment failed attempts
            await this.handleFailedLogin(user.id);
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check user status
        if (user.status === 'PENDING_VERIFICATION') {
            throw new ForbiddenException('Please verify your email before logging in');
        }

        if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
            throw new ForbiddenException('Your account has been suspended or deactivated');
        }

        // Check company status
        if (user.company && !user.company.isActive) {
            throw new ForbiddenException('Your company account has been suspended');
        }

        // Check if 2FA is required
        if (user.twoFactorEnabled) {
            // Return partial response requiring 2FA
            const tempToken = this.jwtService.sign(
                { sub: user.id, requires2FA: true },
                { expiresIn: '5m' },
            );

            return {
                requires2FA: true,
                tempToken,
            };
        }

        // Generate tokens and complete login
        return this.completeLogin(user, ipAddress, userAgent);
    }

    async verify2FALogin(tempToken: string, code: string, ipAddress: string, userAgent: string) {
        try {
            const payload = this.jwtService.verify(tempToken);

            if (!payload.requires2FA) {
                throw new BadRequestException('Invalid token');
            }

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                include: { company: true },
            });

            if (!user || !user.twoFactorSecret) {
                throw new BadRequestException('Invalid token');
            }

            const isValid = this.twoFactorService.verifyToken(user.twoFactorSecret, code);

            if (!isValid) {
                throw new UnauthorizedException('Invalid 2FA code');
            }

            return this.completeLogin(user, ipAddress, userAgent);
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }

    private async completeLogin(user: any, ipAddress: string, userAgent: string) {
        // Reset failed attempts and update login info
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
                lastLoginIp: ipAddress,
            },
        });

        // Generate tokens
        const tokens = await this.generateTokens(user);

        // Store refresh token
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: tokens.refreshToken,
                userAgent,
                ipAddress,
                expiresAt: addDays(new Date(), 7),
            },
        });

        this.logger.log(`User logged in: ${user.email}`, 'AuthService');

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                avatar: user.avatar,
                companyId: user.companyId,
                companyName: user.company?.name,
                employee: user.employee,
            },
            ...tokens,
        };
    }

    private async handleFailedLogin(userId: string) {
        const maxAttempts = this.configService.get<number>('MAX_LOGIN_ATTEMPTS') || 5;
        const lockoutMinutes = this.configService.get<number>('LOCKOUT_DURATION_MINUTES') || 30;

        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                failedLoginAttempts: { increment: 1 },
            },
        });

        if (user.failedLoginAttempts >= maxAttempts) {
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    lockedUntil: addMinutes(new Date(), lockoutMinutes),
                },
            });

            this.logger.warn(
                `Account locked due to too many failed attempts: ${user.email}`,
                'AuthService',
            );
        }
    }

    // ==================== TOKEN MANAGEMENT ====================

    async generateTokens(user: any): Promise<AuthTokens> {
        const payload: TokenPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
        };

        const accessToken = this.jwtService.sign(payload);

        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d',
        });

        return {
            accessToken,
            refreshToken,
            expiresIn: 86400, // 1 day in seconds
        };
    }

    async refreshTokens(refreshToken: string, ipAddress: string, userAgent: string) {
        // Find token in database
        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: {
                user: {
                    include: { company: true },
                },
            },
        });

        if (!storedToken) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Check if token is expired
        if (isBefore(storedToken.expiresAt, new Date())) {
            await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
            throw new UnauthorizedException('Refresh token expired');
        }

        // Verify token
        try {
            this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });
        } catch {
            await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Delete old token and create new ones (token rotation)
        await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

        const tokens = await this.generateTokens(storedToken.user);

        // Store new refresh token
        await this.prisma.refreshToken.create({
            data: {
                userId: storedToken.user.id,
                token: tokens.refreshToken,
                userAgent,
                ipAddress,
                expiresAt: addDays(new Date(), 7),
            },
        });

        return {
            user: {
                id: storedToken.user.id,
                email: storedToken.user.email,
                firstName: storedToken.user.firstName,
                lastName: storedToken.user.lastName,
                role: storedToken.user.role,
                companyId: storedToken.user.companyId,
            },
            ...tokens,
        };
    }

    async logout(userId: string, refreshToken?: string) {
        if (refreshToken) {
            await this.prisma.refreshToken.deleteMany({
                where: {
                    userId,
                    token: refreshToken,
                },
            });
        } else {
            // Logout from all devices
            await this.prisma.refreshToken.deleteMany({
                where: { userId },
            });
        }

        return { message: 'Logged out successfully' };
    }

    // ==================== EMAIL VERIFICATION ====================

    async verifyEmail(dto: VerifyEmailDto) {
        const user = await this.prisma.user.findFirst({
            where: {
                emailVerificationToken: dto.token,
                emailVerificationExpires: { gte: new Date() },
            },
        });

        if (!user) {
            throw new BadRequestException('Invalid or expired verification token');
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                status: 'ACTIVE',
                emailVerificationToken: null,
                emailVerificationExpires: null,
            },
        });

        this.logger.log(`Email verified for user: ${user.email}`, 'AuthService');

        return { message: 'Email verified successfully. You can now log in.' };
    }

    async resendVerification(email: string) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            // Don't reveal if email exists
            return { message: 'If a matching account exists, a verification email has been sent.' };
        }

        if (user.emailVerified) {
            throw new BadRequestException('Email already verified');
        }

        const emailVerificationToken = uuidv4();
        const emailVerificationExpires = addDays(new Date(), 1);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerificationToken,
                emailVerificationExpires,
            },
        });

        await this.emailService.sendVerificationEmail(
            user.email,
            user.firstName,
            emailVerificationToken,
        );

        return { message: 'Verification email sent.' };
    }

    // ==================== PASSWORD RESET ====================

    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });

        if (!user) {
            // Don't reveal if email exists
            return { message: 'If a matching account exists, a password reset email has been sent.' };
        }

        const passwordResetToken = uuidv4();
        const passwordResetExpires = addMinutes(new Date(), 60);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken,
                passwordResetExpires,
            },
        });

        await this.emailService.sendPasswordResetEmail(
            user.email,
            user.firstName,
            passwordResetToken,
        );

        this.logger.log(`Password reset requested for: ${user.email}`, 'AuthService');

        return { message: 'If a matching account exists, a password reset email has been sent.' };
    }

    async resetPassword(dto: ResetPasswordDto) {
        const user = await this.prisma.user.findFirst({
            where: {
                passwordResetToken: dto.token,
                passwordResetExpires: { gte: new Date() },
            },
        });

        if (!user) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        const saltRounds = parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS') || '12', 10);
        const passwordHash = await bcrypt.hash(dto.password, saltRounds);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpires: null,
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
        });

        // Invalidate all refresh tokens
        await this.prisma.refreshToken.deleteMany({
            where: { userId: user.id },
        });

        this.logger.log(`Password reset completed for: ${user.email}`, 'AuthService');

        return { message: 'Password reset successful. You can now log in with your new password.' };
    }

    // ==================== 2FA ====================

    async enable2FA(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (user.twoFactorEnabled) {
            throw new BadRequestException('2FA is already enabled');
        }

        const { secret, otpAuthUrl } = this.twoFactorService.generateSecret(user.email);
        const qrCodeDataUrl = await this.twoFactorService.generateQRCode(otpAuthUrl);

        // Store secret temporarily (will be confirmed on verification)
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorSecret: secret },
        });

        return {
            secret,
            qrCodeDataUrl,
        };
    }

    async confirm2FA(userId: string, dto: Verify2FADto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.twoFactorSecret) {
            throw new BadRequestException('Please initiate 2FA setup first');
        }

        const isValid = this.twoFactorService.verifyToken(user.twoFactorSecret, dto.code);

        if (!isValid) {
            throw new BadRequestException('Invalid verification code');
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true },
        });

        this.logger.log(`2FA enabled for user: ${user.email}`, 'AuthService');

        return { message: '2FA enabled successfully' };
    }

    async disable2FA(userId: string, dto: Verify2FADto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.twoFactorSecret) {
            throw new BadRequestException('2FA is not enabled');
        }

        const isValid = this.twoFactorService.verifyToken(user.twoFactorSecret, dto.code);

        if (!isValid) {
            throw new BadRequestException('Invalid verification code');
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
            },
        });

        this.logger.log(`2FA disabled for user: ${user.email}`, 'AuthService');

        return { message: '2FA disabled successfully' };
    }

    // ==================== HELPERS ====================

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    private async createDefaultLeaveTypes(tx: any, companyId: string) {
        const defaultLeaveTypes = [
            { name: 'Casual Leave', code: 'CL', defaultDays: 12, color: '#10B981' },
            { name: 'Sick Leave', code: 'SL', defaultDays: 10, color: '#EF4444', requiresDocument: true },
            { name: 'Paid Leave', code: 'PL', defaultDays: 15, color: '#3B82F6' },
            { name: 'Unpaid Leave', code: 'UL', defaultDays: 0, color: '#6B7280', isPaid: false },
            { name: 'Maternity Leave', code: 'ML', defaultDays: 180, color: '#EC4899', applicableGender: 'F' },
            { name: 'Paternity Leave', code: 'PTL', defaultDays: 14, color: '#8B5CF6', applicableGender: 'M' },
            { name: 'Bereavement Leave', code: 'BL', defaultDays: 5, color: '#374151' },
        ];

        for (const leaveType of defaultLeaveTypes) {
            await tx.leaveType.create({
                data: {
                    companyId,
                    ...leaveType,
                },
            });
        }
    }
}
