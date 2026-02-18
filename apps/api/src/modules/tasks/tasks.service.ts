import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus, NotificationType, Prisma } from '@prisma/client';
import { startOfDay, endOfDay, eachDayOfInterval, isWeekend, parseISO, format } from 'date-fns';

import { ZohoService } from './zoho.service';

@Injectable()
export class TasksService {
    private readonly logger = new Logger(TasksService.name);

    constructor(
        private prisma: PrismaService,
        private zohoService: ZohoService
    ) { }

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
        parentTaskId?: string; // Filter by parent task (for subtasks)
        includeSubtasks?: boolean; // Whether to include only parent tasks
    }) {
        const where: Prisma.TaskWhereInput = { companyId };

        // By default, only show parent tasks (not subtasks) unless filtering by parentTaskId
        if (query.parentTaskId) {
            where.parentTaskId = query.parentTaskId;
        } else if (!query.includeSubtasks) {
            where.parentTaskId = null; // Only top-level tasks
        }

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
                },
                subtasks: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        priority: true
                    }
                },
                _count: {
                    select: {
                        subtasks: true,
                        timeLogs: true
                    }
                },
                parentTask: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, companyId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id, companyId },
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
                },
                subtasks: {
                    include: {
                        assignees: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                avatar: true
                            }
                        },
                        _count: {
                            select: { timeLogs: true }
                        },
                        timeLogs: {
                            include: {
                                employee: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        avatar: true
                                    }
                                }
                            },
                            orderBy: { date: 'desc' }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                timeLogs: {
                    include: {
                        employee: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                avatar: true
                            }
                        }
                    },
                    orderBy: { date: 'desc' }
                },
                parentTask: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!task) throw new NotFoundException('Task not found');

        // Calculate total hours (including subtasks)
        let totalMinutes = task.timeLogs.reduce((sum, log) => sum + log.durationMinutes, 0);

        // Add subtask hours
        for (const subtask of task.subtasks) {
            const subtaskLogs = await this.prisma.timeLog.aggregate({
                where: { taskId: subtask.id },
                _sum: { durationMinutes: true }
            });
            totalMinutes += subtaskLogs._sum.durationMinutes || 0;
        }

        return {
            ...task,
            totalMinutes,
            totalHours: Math.round(totalMinutes / 60 * 100) / 100
        };
    }

    async update(id: string, companyId: string, data: any) {
        const { assigneeIds, ...rest } = data;

        const updateData: any = { ...rest };

        if (assigneeIds) {
            updateData.assignees = {
                set: assigneeIds.map((aId: string) => ({ id: aId })),
            };
        }

        return this.prisma.task.update({
            where: { id, companyId },
            data: updateData,
            include: {
                project: true,
                assignees: { include: { user: true } }
            }
        });
    }

    async remove(id: string, companyId: string) {
        return this.prisma.task.delete({
            where: { id, companyId }
        });
    }

    async getWorkload(companyId: string, startDateStr: string, endDateStr: string) {
        // Zoho Integration Check
        if (process.env.ZOHO_CLIENT_ID && process.env.ZOHO_REFRESH_TOKEN) {
            return this.zohoService.getWorkload(startDateStr, endDateStr);
        }

        try {
            const start = startOfDay(parseISO(startDateStr));
            const end = endOfDay(parseISO(endDateStr));

            const employees = await this.prisma.employee.findMany({
                where: {
                    companyId,
                    isActive: true,
                },
                include: {
                    user: true, // For avatar fallback? No, emp has avatar
                    designation: true,
                    assignedTasks: {
                        where: {
                            companyId,
                            startDate: { lte: end },
                            dueDate: { gte: start },
                            // status: { not: 'COMPLETED' }
                            // Keeping completed tasks in view might confuse "current load" vs "past load".
                            // But ClickUp shows past load too. If I filter COMPLETED, past load disappears.
                            // I'll keep COMPLETED tasks to show historical workload.
                            // Change logic: Include ALL tasks in range.
                        },
                        include: {
                            project: true,
                            timeLogs: {
                                select: {
                                    date: true,
                                    durationMinutes: true
                                }
                            }
                        }
                    }
                }
            });

            // Process Workload
            const workloadData = employees.map(emp => {
                const dailyLoad: Record<string, number> = {};
                const taskDetails: any[] = [];

                emp.assignedTasks.forEach(task => {
                    if (!task.startDate || !task.dueDate || !task.estimatedHours || task.estimatedHours <= 0) return;

                    const taskStart = startOfDay(task.startDate);
                    const taskDue = endOfDay(task.dueDate);

                    // Calculate total working days in task duration
                    // Note: If taskStart > taskDue, interval throws error. Check validity.
                    if (taskStart > taskDue) return;

                    const totalDaysInterval = eachDayOfInterval({ start: taskStart, end: taskDue });
                    const workingDays = totalDaysInterval.filter(day => !isWeekend(day)).length;

                    if (workingDays === 0) return;

                    const hoursPerDay = task.estimatedHours / workingDays;

                    // Distribute to view range
                    const effectiveStart = taskStart < start ? start : taskStart;
                    const effectiveEnd = taskDue > end ? end : taskDue;

                    if (effectiveStart > effectiveEnd) return;

                    const viewDays = eachDayOfInterval({ start: effectiveStart, end: effectiveEnd });

                    viewDays.forEach(day => {
                        if (isWeekend(day)) return;
                        const dateKey = format(day, 'yyyy-MM-dd');
                        dailyLoad[dateKey] = (dailyLoad[dateKey] || 0) + hoursPerDay;
                    });

                    // Calculate logged hours
                    const dailyLogged: Record<string, number> = {};
                    (task as any).timeLogs?.forEach((log: any) => {
                        const dKey = format(new Date(log.date), 'yyyy-MM-dd');
                        dailyLogged[dKey] = (dailyLogged[dKey] || 0) + (log.durationMinutes / 60);
                    });

                    taskDetails.push({
                        id: task.id,
                        name: task.name,
                        project: task.project.title,
                        startDate: task.startDate,
                        dueDate: task.dueDate,
                        estimatedHours: task.estimatedHours,
                        dailyHours: hoursPerDay,
                        status: task.status,
                        billingType: (task as any).billingType,
                        dailyLoggedHours: dailyLogged
                    });
                });

                return {
                    id: emp.id,
                    name: `${emp.firstName} ${emp.lastName}`,
                    avatar: emp.avatar,
                    designation: emp.designation?.name || 'Employee',
                    capacity: 8,
                    workload: dailyLoad,
                    tasks: taskDetails
                };
            });

            return workloadData;
        } catch (error) {
            this.logger.error(`Failed to get workload: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to fetch workload data');
        }
    }
}
