import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WinstonLoggerService } from '../../common/services/logger.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { LeaveQueryDto } from './dto/leave-query.dto';
import { LeaveActionDto } from './dto/leave-action.dto';
import {
    differenceInDays,
    eachDayOfInterval,
    isWeekend,
    startOfDay,
    parseISO,
    format,
} from 'date-fns';
import { LeaveStatus, AttendanceStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LeavesService {
    constructor(
        private prisma: PrismaService,
        private logger: WinstonLoggerService,
        private notificationsService: NotificationsService,
    ) { }

    async create(employeeId: string, companyId: string, dto: CreateLeaveDto) {
        // Get leave type
        const leaveType = await this.prisma.leaveType.findFirst({
            where: { id: dto.leaveTypeId, companyId, isActive: true },
        });

        if (!leaveType) {
            throw new NotFoundException('Leave type not found');
        }

        // Get employee with leave balances
        const employee = await this.prisma.employee.findFirst({
            where: { id: employeeId, companyId, isActive: true },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        const startDate = parseISO(dto.startDate);
        const endDate = parseISO(dto.endDate);

        // Validate dates
        if (startDate > endDate) {
            throw new BadRequestException('End date must be after start date');
        }

        // Check for backdated leave
        const today = startOfDay(new Date());
        if (startDate < today && !leaveType.allowBackdated) {
            throw new BadRequestException('Backdated leave is not allowed for this leave type');
        }

        // Calculate leave days
        let totalDays = this.calculateLeaveDays(startDate, endDate, companyId);

        if (dto.isHalfDay) {
            totalDays = 0.5;
        }

        // Check minimum and maximum days
        if (totalDays < Number(leaveType.minDays)) {
            throw new BadRequestException(
                `Minimum ${leaveType.minDays} day(s) required for this leave type`,
            );
        }

        if (totalDays > leaveType.maxDays) {
            throw new BadRequestException(
                `Maximum ${leaveType.maxDays} days allowed for this leave type`,
            );
        }

        // Check leave balance
        const balances = employee.leaveBalances as Record<string, number>;
        const currentBalance = balances[dto.leaveTypeId] ?? 0;

        if (currentBalance < totalDays) {
            throw new BadRequestException(
                `Insufficient leave balance. Available: ${currentBalance}, Requested: ${totalDays}`,
            );
        }

        // Check for overlapping leaves
        const overlapping = await this.prisma.leave.findFirst({
            where: {
                employeeId,
                status: { in: ['PENDING', 'APPROVED'] },
                OR: [
                    {
                        startDate: { lte: endDate },
                        endDate: { gte: startDate },
                    },
                ],
            },
        });

        if (overlapping) {
            throw new BadRequestException('Leave overlaps with an existing leave request');
        }

        // Create leave request
        const leave = await this.prisma.leave.create({
            data: {
                companyId,
                employeeId,
                leaveTypeId: dto.leaveTypeId,
                startDate,
                endDate,
                totalDays,
                isHalfDay: dto.isHalfDay || false,
                halfDayType: dto.halfDayType,
                reason: dto.reason,
                documentUrl: dto.documentUrl,
                status: leaveType.requiresApproval ? LeaveStatus.PENDING : LeaveStatus.APPROVED,
            },
            include: {
                leaveType: { select: { name: true, code: true } },
                employee: { select: { firstName: true, lastName: true } },
            },
        });

        // If auto-approved, update leave balance and attendance
        if (!leaveType.requiresApproval) {
            await this.processApprovedLeave(leave);
        }

        this.logger.log(
            `Leave request created: ${leave.id} for employee ${employeeId}`,
            'LeavesService',
        );

        // Notify Admins
        try {
            const admins = await this.prisma.user.findMany({
                where: {
                    companyId,
                    role: { in: ['COMPANY_ADMIN', 'HR_MANAGER'] },
                },
            });

            for (const admin of admins) {
                await this.notificationsService.create({
                    companyId,
                    userId: admin.id,
                    type: NotificationType.LEAVE_REQUEST,
                    title: 'New Leave Request',
                    message: `${leave.employee?.firstName} ${leave.employee?.lastName} requested ${leave.totalDays} day(s) of ${leave.leaveType?.name}`,
                    entityId: leave.id,
                    entityType: 'LEAVE',
                });
            }
        } catch (error) {
            this.logger.error(`Failed to send notifications: ${error.message}`, 'LeavesService');
        }

        return leave;
    }

    async getLeaveTypes(companyId: string, employeeId?: string) {
        const leaveTypes = await this.prisma.leaveType.findMany({
            where: { companyId, isActive: true },
            orderBy: { name: 'asc' },
        });

        if (employeeId) {
            const employee = await this.prisma.employee.findUnique({
                where: { id: employeeId },
                select: { leaveBalances: true },
            });

            if (employee?.leaveBalances) {
                const balances = employee.leaveBalances as Record<string, number>;
                // Only return leave types that have been assigned to the employee
                return leaveTypes
                    .filter(type => Object.prototype.hasOwnProperty.call(balances, type.id))
                    .map(type => ({
                        ...type,
                        balance: balances[type.id] ?? 0,
                    }));
            } else {
                return [];
            }
        }

        return leaveTypes;
    }

    async findAll(companyId: string, query: LeaveQueryDto, requestingUser: any) {
        const {
            employeeId,
            departmentId,
            leaveTypeId,
            status,
            startDate,
            endDate,
            page = 1,
            limit = 20,
        } = query;

        const skip = (page - 1) * limit;
        const where: any = { companyId };

        // Role-based filtering
        if (requestingUser.role === 'EMPLOYEE') {
            where.employeeId = requestingUser.employee?.id;
        } else if (requestingUser.role === 'TEAM_MANAGER') {
            // Team managers can see their team's leaves
            where.employee = {
                OR: [
                    { id: requestingUser.employee?.id },
                    { managerId: requestingUser.employee?.id },
                ],
            };
        }

        if (employeeId) where.employeeId = employeeId;
        if (leaveTypeId) where.leaveTypeId = leaveTypeId;
        if (status) where.status = status;

        if (departmentId) {
            where.employee = { ...where.employee, departmentId };
        }

        if (startDate || endDate) {
            where.OR = [];
            if (startDate) {
                where.OR.push({ startDate: { gte: new Date(startDate) } });
            }
            if (endDate) {
                where.OR.push({ endDate: { lte: new Date(endDate) } });
            }
        }

        const [leaves, total] = await Promise.all([
            this.prisma.leave.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                            department: { select: { name: true } },
                        },
                    },
                    leaveType: { select: { name: true, code: true, color: true } },
                    approver: { select: { firstName: true, lastName: true } },
                },
            }),
            this.prisma.leave.count({ where }),
        ]);

        return {
            items: leaves,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: string, companyId: string) {
        const leave = await this.prisma.leave.findFirst({
            where: { id, companyId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { name: true } },
                        designation: { select: { name: true } },
                    },
                },
                leaveType: true,
                approver: { select: { firstName: true, lastName: true } },
            },
        });

        if (!leave) {
            throw new NotFoundException('Leave request not found');
        }

        return leave;
    }

    async approve(id: string, companyId: string, approverId: string, dto: LeaveActionDto) {
        const leave = await this.prisma.leave.findFirst({
            where: { id, companyId },
            include: { leaveType: true, employee: true },
        });

        if (!leave) {
            throw new NotFoundException('Leave request not found');
        }

        if (leave.status !== LeaveStatus.PENDING) {
            throw new BadRequestException('Leave is not pending approval');
        }

        const updatedLeave = await this.prisma.leave.update({
            where: { id },
            data: {
                status: LeaveStatus.APPROVED,
                approvedBy: approverId,
                approvedAt: new Date(),
                approverNote: dto.note,
            },
            include: {
                leaveType: true,
                employee: { include: { user: true } },
            },
        });

        // Process approved leave
        await this.processApprovedLeave(updatedLeave);

        this.logger.log(`Leave ${id} approved by ${approverId}`, 'LeavesService');

        if (updatedLeave.employee?.user?.id) {
            await this.notificationsService.create({
                companyId,
                userId: updatedLeave.employee.user.id,
                type: NotificationType.LEAVE_APPROVED,
                title: 'Leave Approved',
                message: `Your leave for ${updatedLeave.leaveType.name} from ${format(updatedLeave.startDate, 'MMM d')} to ${format(updatedLeave.endDate, 'MMM d')} has been approved.`,
                entityId: id,
                entityType: 'LEAVE',
            });
        }

        return updatedLeave;
    }

    async reject(id: string, companyId: string, approverId: string, dto: LeaveActionDto) {
        const leave = await this.prisma.leave.findFirst({
            where: { id, companyId },
        });

        if (!leave) {
            throw new NotFoundException('Leave request not found');
        }

        if (leave.status !== LeaveStatus.PENDING) {
            throw new BadRequestException('Leave is not pending');
        }

        if (!dto.reason) {
            throw new BadRequestException('Rejection reason is required');
        }

        const updatedLeave = await this.prisma.leave.update({
            where: { id },
            data: {
                status: LeaveStatus.REJECTED,
                approvedBy: approverId,
                approvedAt: new Date(),
                rejectionReason: dto.reason,
            },
            include: {
                leaveType: true,
                employee: { include: { user: true } },
            },
        });

        if (updatedLeave.employee?.user?.id) {
            await this.notificationsService.create({
                companyId,
                userId: updatedLeave.employee.user.id,
                type: NotificationType.LEAVE_REJECTED,
                title: 'Leave Rejected',
                message: `Your leave request for ${updatedLeave.leaveType?.name} was rejected. Reason: ${dto.reason}`,
                entityId: id,
                entityType: 'LEAVE',
            });
        }

        return updatedLeave;
    }

    async cancel(id: string, employeeId: string, companyId: string) {
        const leave = await this.prisma.leave.findFirst({
            where: { id, companyId, employeeId },
        });

        if (!leave) {
            throw new NotFoundException('Leave request not found');
        }

        if (leave.status === LeaveStatus.CANCELLED) {
            throw new BadRequestException('Leave is already cancelled');
        }

        // If leave was approved, restore balance
        if (leave.status === LeaveStatus.APPROVED) {
            await this.restoreLeaveBalance(leave);
        }

        return this.prisma.leave.update({
            where: { id },
            data: { status: LeaveStatus.CANCELLED },
        });
    }

    async getCalendar(companyId: string, month: number, year: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const [leaves, holidays] = await Promise.all([
            this.prisma.leave.findMany({
                where: {
                    companyId,
                    status: LeaveStatus.APPROVED,
                    OR: [
                        {
                            startDate: { lte: endDate },
                            endDate: { gte: startDate },
                        },
                    ],
                },
                include: {
                    employee: {
                        select: { firstName: true, lastName: true, avatar: true },
                    },
                    leaveType: { select: { name: true, color: true } },
                },
            }),
            this.prisma.holiday.findMany({
                where: {
                    companyId,
                    date: { gte: startDate, lte: endDate },
                },
            }),
        ]);

        return {
            month,
            year,
            leaves: leaves.map((l) => ({
                id: l.id,
                employee: l.employee,
                leaveType: l.leaveType,
                startDate: l.startDate,
                endDate: l.endDate,
                isHalfDay: l.isHalfDay,
            })),
            holidays: holidays.map((h) => ({
                id: h.id,
                name: h.name,
                date: h.date,
                type: h.type,
            })),
        };
    }

    async getPending(companyId: string, approverId: string) {
        // Get employees reporting to this approver
        const directReports = await this.prisma.employee.findMany({
            where: { companyId, managerId: approverId, isActive: true },
            select: { id: true },
        });

        const reportIds = directReports.map((e) => e.id);

        return this.prisma.leave.findMany({
            where: {
                companyId,
                status: LeaveStatus.PENDING,
                employeeId: { in: reportIds },
            },
            include: {
                employee: {
                    select: {
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        avatar: true,
                    },
                },
                leaveType: { select: { name: true, color: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    private async processApprovedLeave(leave: any) {
        const { employeeId, leaveTypeId, totalDays, startDate, endDate, companyId } = leave;

        // Deduct from leave balance
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
        });

        if (employee) {
            const balances = employee.leaveBalances as Record<string, number>;
            balances[leaveTypeId] = (balances[leaveTypeId] || 0) - Number(totalDays);

            await this.prisma.employee.update({
                where: { id: employeeId },
                data: { leaveBalances: balances },
            });
        }

        // Create attendance records for leave days
        const leaveDays = eachDayOfInterval({ start: startDate, end: endDate });

        for (const day of leaveDays) {
            // Skip weekends
            if (isWeekend(day)) continue;

            await this.prisma.attendanceRecord.upsert({
                where: {
                    employeeId_date: {
                        employeeId,
                        date: startOfDay(day),
                    },
                },
                create: {
                    companyId,
                    employeeId,
                    date: startOfDay(day),
                    status: AttendanceStatus.ON_LEAVE,
                    isApproved: true,
                },
                update: {
                    status: AttendanceStatus.ON_LEAVE,
                },
            });
        }
    }

    private async restoreLeaveBalance(leave: any) {
        const employee = await this.prisma.employee.findUnique({
            where: { id: leave.employeeId },
        });

        if (employee) {
            const balances = employee.leaveBalances as Record<string, number>;
            balances[leave.leaveTypeId] = (balances[leave.leaveTypeId] || 0) + Number(leave.totalDays);

            await this.prisma.employee.update({
                where: { id: leave.employeeId },
                data: { leaveBalances: balances },
            });
        }
    }

    private calculateLeaveDays(start: Date, end: Date, companyId: string): number {
        let days = 0;
        const interval = eachDayOfInterval({ start, end });

        for (const day of interval) {
            if (!isWeekend(day)) {
                days++;
            }
        }

        // TODO: Exclude company holidays from count

        return days;
    }
}
