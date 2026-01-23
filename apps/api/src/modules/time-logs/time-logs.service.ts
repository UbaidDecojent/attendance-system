import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTimeLogDto } from './dto/create-time-log.dto';
import { TimeLogStatus, Prisma, BillingType } from '@prisma/client';

@Injectable()
export class TimeLogsService {
    private readonly logger = new Logger(TimeLogsService.name);

    constructor(private prisma: PrismaService) { }

    private parseDuration(duration: string): number {
        const [hours, minutes] = duration.split(':').map(Number);
        return (hours * 60) + minutes;
    }

    async create(companyId: string, user: any, data: CreateTimeLogDto) {
        try {
            const minutes = this.parseDuration(data.duration);

            // Determine Status: Admin -> APPROVED, Employee -> PENDING
            const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'].includes(user.role);
            const status = isAdmin ? TimeLogStatus.APPROVED : TimeLogStatus.PENDING;

            // Ensure Employee ID exists
            const employeeId = user.employee?.id || user.employeeId;
            if (!employeeId) {
                throw new ForbiddenException('User is not linked to an employee profile');
            }

            return await this.prisma.timeLog.create({
                data: {
                    companyId,
                    projectId: data.projectId,
                    taskId: data.taskId,
                    employeeId: employeeId,
                    date: new Date(data.date),
                    durationMinutes: minutes,
                    billingType: data.billingType,
                    description: data.description,
                    status,
                },
                include: {
                    task: true,
                    project: true,
                    employee: true
                }
            });
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
    }

    async findAll(companyId: string, user: any, query: {
        startDate?: string;
        endDate?: string;
        projectIds?: string[];
        userIds?: string[];
        status?: TimeLogStatus;
        billingType?: BillingType;
        clientNames?: string[];
    }) {
        const where: Prisma.TimeLogWhereInput = { companyId };

        // Date Range
        if (query.startDate && query.endDate) {
            where.date = {
                gte: new Date(query.startDate),
                lte: new Date(query.endDate),
            };
        }

        // Project Filter (Multi-select)
        if (query.projectIds && query.projectIds.length > 0) {
            where.projectId = { in: query.projectIds };
        }

        // Client Name Filter
        if (query.clientNames && query.clientNames.length > 0) {
            where.project = {
                clientName: { in: query.clientNames }
            };
        }

        // Status Filter
        if (query.status) {
            where.status = query.status;
        }

        // Billing Type Filter
        if (query.billingType) {
            where.billingType = query.billingType;
        }

        // User Filter (For Admin) or Enforce Self (For Employee)
        const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'].includes(user.role);

        if (!isAdmin) {
            // Employees see ONLY their own logs
            const empId = user.employee?.id || user.employeeId;
            if (!empId) return [];
            where.employeeId = empId;
        } else {
            // Admin can filter by users (Multi-select)
            if (query.userIds && query.userIds.length > 0) {
                where.employeeId = { in: query.userIds };
            }
        }

        return this.prisma.timeLog.findMany({
            where,
            include: {
                project: { select: { id: true, title: true } },
                task: { select: { id: true, name: true } },
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true
                    }
                }
            },
            orderBy: { date: 'desc' },
            take: 1000 // Limit results for safety
        });
    }

    async update(id: string, companyId: string, user: any, data: Partial<CreateTimeLogDto>) {
        const log = await this.prisma.timeLog.findUnique({ where: { id } });
        if (!log || log.companyId !== companyId) throw new NotFoundException('Time log not found');

        const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'].includes(user.role);

        // Employee Permission Check
        if (!isAdmin) {
            const empId = user.employee?.id || user.employeeId;
            if (log.employeeId !== empId) throw new ForbiddenException('Cannot edit others logs');
            if (log.status === TimeLogStatus.APPROVED) throw new ForbiddenException('Cannot edit approved logs');
        }

        const updateData: any = {};
        if (data.duration) updateData.durationMinutes = this.parseDuration(data.duration);
        if (data.description !== undefined) updateData.description = data.description;
        if (data.billingType) updateData.billingType = data.billingType;
        if (data.date) updateData.date = new Date(data.date);

        return this.prisma.timeLog.update({
            where: { id },
            data: updateData
        });
    }

    async updateStatus(id: string, companyId: string, status: TimeLogStatus) {
        return this.prisma.timeLog.update({
            where: { id, companyId },
            data: { status }
        });
    }

    async delete(id: string, companyId: string) {
        return this.prisma.timeLog.delete({
            where: { id, companyId }
        });
    }
}
