import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async log(
        action: string,
        entity: string,
        entityId: string | null,
        userId: string | null,
        companyId: string | null,
        oldValues?: object,
        newValues?: object,
        ipAddress?: string,
        userAgent?: string,
    ) {
        return this.prisma.auditLog.create({
            data: {
                action,
                entity,
                entityId,
                userId,
                companyId,
                oldValues,
                newValues,
                ipAddress,
                userAgent,
            },
        });
    }

    async getAuditLogs(
        companyId: string,
        options: {
            entity?: string;
            userId?: string;
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        },
    ) {
        const { entity, userId, startDate, endDate, page = 1, limit = 50 } = options;
        const skip = (page - 1) * limit;

        const where: any = { companyId };
        if (entity) where.entity = entity;
        if (userId) where.userId = userId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { firstName: true, lastName: true, email: true } } },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return { items: logs, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
}
