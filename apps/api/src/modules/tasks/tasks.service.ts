import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus, NotificationType, Prisma } from '@prisma/client';

@Injectable()
export class TasksService {
    private readonly logger = new Logger(TasksService.name);

    constructor(private prisma: PrismaService) { }

    async create(companyId: string, data: CreateTaskDto) {
        try {
            const { assigneeIds, ...rest } = data;

            const task = await this.prisma.task.create({
                data: {
                    ...rest,
                    companyId,
                    assignees: {
                        connect: assigneeIds.map((id) => ({ id })),
                    },
                },
                include: {
                    project: true,
                    assignees: {
                        include: { user: true }
                    } // To get user IDs for notification
                },
            });

            // Create Notifications
            const notifications = task.assignees
                .filter((emp) => emp.user) // Only notify employees with User accounts
                .map((emp) => ({
                    companyId,
                    userId: emp.user!.id,
                    type: NotificationType.TASK_ASSIGNED,
                    title: 'New Task Assigned',
                    message: `You have been assigned to task: ${task.name} in project ${task.project.title}`,
                    entityId: task.id,
                    entityType: 'Task',
                }));

            if (notifications.length > 0) {
                await this.prisma.notification.createMany({
                    data: notifications as any, // Schema might need manual type cast if generic
                });
            }

            return task;
        } catch (error) {
            this.logger.error(`Failed to create task: ${error.message}`, error.stack);
            // Debug log to file
            const fs = require('fs');
            try {
                fs.appendFileSync('d:/attendance/error.log', `Error: ${error.message}\nStack: ${error.stack}\n`);
            } catch (e) {
                // failed to write log
            }
            throw new InternalServerErrorException('Failed to create task');
        }
    }

    async findAll(companyId: string, user: any, query: {
        projectId?: string;
        status?: string;
        priority?: string;
        billingType?: string;
        assigneeId?: string;
        startDate?: string;
        dueDate?: string;
    }) {
        const where: Prisma.TaskWhereInput = { companyId };

        if (query.projectId) where.projectId = query.projectId;
        if (query.status && query.status !== 'ALL') where.status = query.status as TaskStatus;
        if (query.priority && query.priority !== 'ALL') where.priority = query.priority as any;
        if (query.billingType && query.billingType !== 'ALL') where.billingType = query.billingType as any;

        if (query.startDate) {
            const start = new Date(query.startDate);
            // Verify valid date
            if (!isNaN(start.getTime())) {
                where.startDate = { gte: start };
            }
        }
        if (query.dueDate) {
            const due = new Date(query.dueDate);
            if (!isNaN(due.getTime())) {
                where.dueDate = { lte: due };
            }
        }

        // Assignee Filter
        if (query.assigneeId && query.assigneeId !== 'ALL') {
            where.assignees = { some: { id: query.assigneeId } };
        }

        // Role-based filtering overrides assignee filter for employees
        if (user.role === 'EMPLOYEE' || user.role === 'TEAM_MANAGER') {
            if (user.employeeId) {
                where.assignees = {
                    some: {
                        id: user.employeeId
                    }
                };
            }
        }

        return this.prisma.task.findMany({
            where,
            include: {
                assignees: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        designation: { select: { name: true } }
                    },
                },
                project: {
                    select: {
                        id: true,
                        title: true,
                        ownerId: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async update(id: string, companyId: string, data: any) {
        // Simple update for status/etc.
        // If updating assignees, need special logic, but for now simple update
        return this.prisma.task.update({
            where: { id, companyId },
            data
        });
    }
}
