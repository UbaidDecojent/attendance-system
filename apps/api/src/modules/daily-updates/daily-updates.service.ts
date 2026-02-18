import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDailyUpdateDto, UpdateDailyUpdateDto } from './dto/daily-update.dto';
import { startOfDay, endOfDay } from 'date-fns';
import { DailyUpdateStatus } from '@prisma/client';

// Constants for workload calculation
const PRODUCTIVE_HOURS = 7; // Out of 9-hour shift

@Injectable()
export class DailyUpdatesService {
    constructor(private readonly prisma: PrismaService) { }

    // Create a daily update (employee submits their work for today)
    async create(companyId: string, employeeId: string, dto: CreateDailyUpdateDto) {
        const today = new Date();
        const dateOnly = startOfDay(today);

        // Verify the task belongs to a project the employee is assigned to
        const task = await this.prisma.task.findFirst({
            where: {
                id: dto.taskId,
                projectId: dto.projectId,
                companyId,
                assignees: {
                    some: { id: employeeId }
                }
            }
        });

        if (!task) {
            throw new ForbiddenException('Task not found or you are not assigned to it');
        }

        return this.prisma.dailyUpdate.create({
            data: {
                companyId,
                employeeId,
                projectId: dto.projectId,
                taskId: dto.taskId,
                date: dateOnly,
                hoursWorked: dto.hoursWorked,
                deadline: dto.deadline ? new Date(dto.deadline) : null,
                billingType: dto.billingType,
                projectType: dto.projectType,
                notes: dto.notes,
                status: DailyUpdateStatus.IN_PROGRESS
            },
            include: {
                project: { select: { id: true, title: true, clientName: true } },
                task: { select: { id: true, name: true } }
            }
        });
    }

    // Get employee's daily updates for today
    async getMyTodayUpdates(companyId: string, employeeId: string) {
        const today = new Date();
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);

        return this.prisma.dailyUpdate.findMany({
            where: {
                companyId,
                employeeId,
                date: {
                    gte: dayStart,
                    lte: dayEnd
                }
            },
            include: {
                project: { select: { id: true, title: true, clientName: true } },
                task: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    // Get projects with tasks assigned to the employee
    async getAssignedProjectsAndTasks(companyId: string, employeeId: string) {
        console.log('Getting assigned projects for:', { companyId, employeeId });

        // Get tasks assigned to this employee
        const tasks = await this.prisma.task.findMany({
            where: {
                companyId,
                assignees: {
                    some: { id: employeeId }
                },
                status: {
                    notIn: ['COMPLETED', 'CLOSED']
                }
            },
            include: {
                project: {
                    select: { id: true, title: true, clientName: true }
                },
                assignees: {
                    select: { id: true }
                }
            },
            orderBy: { project: { title: 'asc' } }
        });

        console.log('Found tasks:', tasks.length, tasks.map(t => ({ id: t.id, name: t.name, assignees: t.assignees })));

        // Group tasks by project
        const projectMap = new Map<string, any>();
        for (const task of tasks) {
            if (!projectMap.has(task.projectId)) {
                projectMap.set(task.projectId, {
                    id: task.project.id,
                    title: task.project.title,
                    clientName: task.project.clientName,
                    tasks: []
                });
            }
            projectMap.get(task.projectId).tasks.push({
                id: task.id,
                title: task.name
            });
        }

        return Array.from(projectMap.values());
    }

    // Update a daily update
    async update(id: string, companyId: string, employeeId: string, dto: UpdateDailyUpdateDto) {
        const existing = await this.prisma.dailyUpdate.findFirst({
            where: { id, companyId, employeeId }
        });

        if (!existing) {
            throw new NotFoundException('Daily update not found');
        }

        return this.prisma.dailyUpdate.update({
            where: { id },
            data: {
                hoursWorked: dto.hoursWorked,
                deadline: dto.deadline ? new Date(dto.deadline) : undefined,
                billingType: dto.billingType,
                projectType: dto.projectType,
                notes: dto.notes,
                status: dto.status as DailyUpdateStatus
            },
            include: {
                project: { select: { id: true, title: true, clientName: true } },
                task: { select: { id: true, name: true } }
            }
        });
    }

    // Delete a daily update
    async delete(id: string, companyId: string, employeeId: string) {
        const existing = await this.prisma.dailyUpdate.findFirst({
            where: { id, companyId, employeeId }
        });

        if (!existing) {
            throw new NotFoundException('Daily update not found');
        }

        return this.prisma.dailyUpdate.delete({ where: { id } });
    }

    // Admin: Get workload view for all employees (today's updates)
    async getWorkloadView(companyId: string) {
        const today = new Date();
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);

        // Get all daily updates for today with employee info
        const updates = await this.prisma.dailyUpdate.findMany({
            where: {
                companyId,
                date: {
                    gte: dayStart,
                    lte: dayEnd
                }
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        dateOfJoining: true,
                        department: { select: { name: true } },
                        designation: { select: { name: true } }
                    }
                },
                project: { select: { id: true, title: true, clientName: true } },
                task: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group updates by employee and calculate workload
        const employeeMap = new Map<string, any>();

        for (const update of updates) {
            if (!employeeMap.has(update.employeeId)) {
                employeeMap.set(update.employeeId, {
                    employee: update.employee,
                    updates: [],
                    totalHours: 0,
                    hasBillableWork: false,
                    hasClientWork: false
                });
            }

            const empData = employeeMap.get(update.employeeId);
            empData.updates.push({
                id: update.id,
                project: update.project,
                task: update.task,
                hoursWorked: update.hoursWorked,
                deadline: update.deadline,
                billingType: update.billingType,
                projectType: update.projectType,
                status: update.status,
                notes: update.notes
            });
            empData.totalHours += update.hoursWorked;

            if (update.billingType === 'BILLABLE') {
                empData.hasBillableWork = true;
            }
            if (update.projectType === 'CLIENT') {
                empData.hasClientWork = true;
            }
        }

        // Calculate occupation status for each employee
        const result = Array.from(employeeMap.values()).map(emp => {
            const occupancyPercent = Math.min(100, Math.round((emp.totalHours / PRODUCTIVE_HOURS) * 100));

            let statusBadge: string;
            let statusColor: string;

            if (emp.totalHours >= PRODUCTIVE_HOURS) {
                // 7+ hours worked
                if (!emp.hasBillableWork || !emp.hasClientWork) {
                    // Non-billable or In-house work
                    statusBadge = 'Occupied - Available';
                    statusColor = 'yellow';
                } else {
                    statusBadge = 'Occupied';
                    statusColor = 'red';
                }
            } else if (emp.totalHours >= 6) {
                statusBadge = '90% Occupied';
                statusColor = 'orange';
            } else if (emp.totalHours >= 4) {
                statusBadge = `${occupancyPercent}% Occupied`;
                statusColor = 'yellow';
            } else if (emp.totalHours > 0) {
                statusBadge = 'Available';
                statusColor = 'green';
            } else {
                statusBadge = 'No Updates';
                statusColor = 'gray';
            }

            return {
                employee: emp.employee,
                updates: emp.updates,
                totalHours: emp.totalHours,
                occupancyPercent,
                statusBadge,
                statusColor
            };
        });

        // Sort by occupancy (highest first)
        result.sort((a, b) => b.occupancyPercent - a.occupancyPercent);

        return result;
    }
}
