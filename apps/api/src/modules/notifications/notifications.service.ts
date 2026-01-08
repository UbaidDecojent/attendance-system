import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
    constructor(private prisma: PrismaService) { }

    async create(data: {
        companyId: string;
        userId: string;
        type: NotificationType;
        title: string;
        message: string;
        entityId?: string;
        entityType?: string;
    }) {
        return this.prisma.notification.create({
            data,
        });
    }

    async getMyNotifications(userId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            this.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            this.prisma.notification.count({ where: { userId } }),
        ]);

        const unreadCount = await this.prisma.notification.count({
            where: { userId, isRead: false },
        });

        return {
            items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                unreadCount,
            },
        };
    }

    async markAsRead(id: string, userId: string) {
        // Ensure user owns the notification
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });

        if (!notification) {
            throw new Error('Notification not found'); // Or NotFoundException
        }

        return this.prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
    }

    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
}
