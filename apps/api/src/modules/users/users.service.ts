import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) { }

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
                role: true,
                status: true,
                companyId: true,
                twoFactorEnabled: true,
                emailVerified: true,
                lastLoginAt: true,
                createdAt: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        timezone: true,
                    },
                },
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        departmentId: true,
                        designationId: true,
                        department: { select: { id: true, name: true } },
                        designation: { select: { id: true, name: true } },
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
    }

    async update(userId: string, dto: UpdateUserDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                phone: dto.phone,
                avatar: dto.avatar,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
                role: true,
            },
        });
    }

    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const isCurrentPasswordValid = await bcrypt.compare(
            dto.currentPassword,
            user.passwordHash,
        );

        if (!isCurrentPasswordValid) {
            throw new ForbiddenException('Current password is incorrect');
        }

        const saltRounds = parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS') || '12', 10);
        const newPasswordHash = await bcrypt.hash(dto.newPassword, saltRounds);

        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });

        // Invalidate all refresh tokens
        await this.prisma.refreshToken.deleteMany({
            where: { userId },
        });

        return { message: 'Password changed successfully. Please log in again.' };
    }

    async getByCompany(companyId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where: { companyId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    status: true,
                    lastLoginAt: true,
                    createdAt: true,
                },
            }),
            this.prisma.user.count({ where: { companyId } }),
        ]);

        return {
            items: users,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async updateRole(userId: string, role: string, currentUserId: string) {
        if (userId === currentUserId) {
            throw new ForbiddenException('You cannot change your own role');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.role === 'SUPER_ADMIN') {
            throw new ForbiddenException('Cannot change role of a Super Admin');
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: { role: role as any },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
            },
        });
    }
}
