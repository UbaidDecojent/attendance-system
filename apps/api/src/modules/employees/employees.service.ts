import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WinstonLoggerService } from '../../common/services/logger.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { LeaveStatus, AttendanceStatus, NotificationType } from '@prisma/client';

import { addDays, differenceInBusinessDays, subDays, isWeekend } from 'date-fns';
import { EmailService } from '../auth/services/email.service';

@Injectable()
export class EmployeesService {
    constructor(
        private prisma: PrismaService,
        private logger: WinstonLoggerService,
        private configService: ConfigService,
        private emailService: EmailService,
    ) { }

    async create(companyId: string, dto: CreateEmployeeDto) {
        // Check if employee code already exists
        const existingByCode = await this.prisma.employee.findFirst({
            where: { companyId, employeeCode: dto.employeeCode },
        });

        if (existingByCode) {
            throw new ConflictException('Employee code already exists');
        }

        // Check if email already exists in employees
        const existingByEmail = await this.prisma.employee.findFirst({
            where: { companyId, email: dto.email.toLowerCase() },
        });

        if (existingByEmail) {
            throw new ConflictException('Employee email already exists');
        }

        // Check if email already exists in users (important when creating user account)
        if (dto.createUserAccount) {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: dto.email.toLowerCase() },
            });

            if (existingUser) {
                throw new ConflictException('A user account with this email already exists');
            }
        }

        // Validate department
        if (dto.departmentId) {
            const department = await this.prisma.department.findFirst({
                where: { id: dto.departmentId, companyId },
            });
            if (!department) {
                throw new BadRequestException('Department not found');
            }
        }

        // Validate designation
        if (dto.designationId) {
            const designation = await this.prisma.designation.findFirst({
                where: { id: dto.designationId, companyId },
            });
            if (!designation) {
                throw new BadRequestException('Designation not found');
            }
        }

        // Validate shift
        if (dto.shiftId) {
            const shift = await this.prisma.shift.findFirst({
                where: { id: dto.shiftId, companyId },
            });
            if (!shift) {
                throw new BadRequestException('Shift not found');
            }
        }

        // Initialize empty leave balances. Admin must assign them manually.
        const leaveBalances: Record<string, number> = {};

        // Create employee
        const employee = await this.prisma.employee.create({
            data: {
                companyId,
                employeeCode: dto.employeeCode,
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email.toLowerCase(),
                phone: dto.phone,
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
                gender: dto.gender,
                dateOfJoining: new Date(dto.dateOfJoining),
                employmentType: dto.employmentType || 'FULL_TIME',
                departmentId: dto.departmentId,
                designationId: dto.designationId,
                shiftId: dto.shiftId,
                managerId: dto.managerId,
                address: dto.address,
                city: dto.city,
                state: dto.state,
                country: dto.country,
                postalCode: dto.postalCode,
                emergencyContactName: dto.emergencyContactName,
                emergencyContactPhone: dto.emergencyContactPhone,
                emergencyContactRelation: dto.emergencyContactRelation,
                leaveBalances,
            },
            include: {
                department: { select: { id: true, name: true } },
                designation: { select: { id: true, name: true } },
                shift: { select: { id: true, name: true } },
            },
        });

        // Create user account if requested
        if (dto.createUserAccount) {
            const saltRounds = parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS') || '12', 10);

            // Random secure password that user doesn't know (effectively unusable until reset)
            const tempPassword = uuidv4();
            const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

            // Generate Invite Token (reusing Password Reset Token mechanism)
            const passwordResetToken = uuidv4();
            const passwordResetExpires = addDays(new Date(), 7); // 7 days to accept invites

            await this.prisma.user.create({
                data: {
                    companyId,
                    employeeId: employee.id,
                    email: employee.email,
                    passwordHash,
                    firstName: employee.firstName,
                    lastName: employee.lastName,
                    phone: employee.phone,
                    role: dto.userRole || 'EMPLOYEE',
                    status: 'ACTIVE', // Active immediately so they can 'Reset Password' to set it
                    passwordResetToken,
                    passwordResetExpires
                },
            });

            // Fetch company name for email
            const company = await this.prisma.company.findUnique({
                where: { id: companyId },
                select: { name: true }
            });

            if (company) {
                // Send Invite Email
                await this.emailService.sendInviteEmail(
                    employee.email,
                    employee.firstName,
                    passwordResetToken,
                    company.name
                );
            }
        }

        this.logger.log(
            `Employee created: ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`,
            'EmployeesService',
        );

        return employee;
    }

    async findAll(companyId: string, query: EmployeeQueryDto) {
        console.log('EmployeesService.findAll called with:', { companyId, query });
        const {
            search,
            departmentId,
            designationId,
            shiftId,
            status,
            employmentType,
            page = 1,
            limit = 20,
        } = query;

        const skip = (page - 1) * limit;

        const where: any = { companyId };

        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { employeeCode: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (departmentId) where.departmentId = departmentId;
        if (designationId) where.designationId = designationId;
        if (shiftId) where.shiftId = shiftId;
        if (employmentType) where.employmentType = employmentType;

        if (status === 'active') where.isActive = true;
        if (status === 'inactive') where.isActive = false;

        console.log('EmployeesService.findAll where clause:', where);

        const [employees, total] = await Promise.all([
            this.prisma.employee.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    department: { select: { id: true, name: true } },
                    designation: { select: { id: true, name: true } },
                    shift: { select: { id: true, name: true } },
                    user: { select: { id: true, role: true, status: true, lastLoginAt: true } },
                },
            }),
            this.prisma.employee.count({ where }),
        ]);

        let items: any[] = employees;

        if (query.includeLeaveBalances) {
            const leaveTypes = await this.prisma.leaveType.findMany({
                where: { companyId, isActive: true },
            });

            // Fetch approved leaves since 2026-01-01
            const employeeIds = items.map(e => e.id);
            const approvedLeaves = await this.prisma.leave.findMany({
                where: {
                    companyId,
                    employeeId: { in: employeeIds },
                    status: LeaveStatus.APPROVED,
                    startDate: { gte: new Date('2026-01-01') },
                },
                select: {
                    employeeId: true,
                    leaveTypeId: true,
                    totalDays: true,
                    reason: true,
                    startDate: true,
                    endDate: true,
                    leaveType: { select: { name: true, color: true } },
                },
                orderBy: { startDate: 'desc' },
            });

            // Fetch Holidays since 2026-01-01
            const holidays = await this.prisma.holiday.findMany({
                where: {
                    companyId,
                    date: { gte: new Date('2026-01-01') },
                },
                select: { date: true },
            });

            // Fetch Attendance counts since 2026-01-01 (to calculate absent days)
            // We count records up to yesterday to avoid flagging "Today" as absent if they haven't checked in *yet*
            const yesterday = subDays(new Date(), 1);
            const attendanceCounts = await this.prisma.attendanceRecord.groupBy({
                by: ['employeeId'],
                where: {
                    companyId,
                    employeeId: { in: employeeIds },
                    date: {
                        gte: new Date('2026-01-01'),
                        lte: yesterday,
                    },
                },
                _count: { id: true },
            });

            // Maps for fast lookup
            const attendanceMap = new Map<string, number>();
            attendanceCounts.forEach(a => attendanceMap.set(a.employeeId, a._count.id));

            // Group by employee and leave type
            const usedLeavesMap = new Map<string, number>(); // key: `${employeeId}-${leaveTypeId}`
            for (const leave of approvedLeaves) {
                const key = `${leave.employeeId}-${leave.leaveTypeId}`;
                usedLeavesMap.set(key, (usedLeavesMap.get(key) || 0) + Number(leave.totalDays));
            }

            items = employees.map((emp) => {
                const balances = (emp.leaveBalances as Record<string, number>) || {};

                // --- Absent Days Calculation ---
                const startCalc = emp.dateOfJoining > new Date('2026-01-01')
                    ? emp.dateOfJoining
                    : new Date('2026-01-01');

                // Ensure we don't calculate if joined in the future or after yesterday using business days logic
                // If startCalc > yesterday, max(0, negative) handles it partially but logical check is better
                let absentDays = 0;

                if (startCalc <= yesterday) {
                    // +1 to make it inclusive of start and end for "working days available" concept
                    const totalBusinessDays = differenceInBusinessDays(yesterday, startCalc) + 1;

                    const holidayCount = holidays.filter(h =>
                        h.date >= startCalc && h.date <= yesterday && !isWeekend(h.date)
                    ).length;

                    const expectedAttendance = Math.max(0, totalBusinessDays - holidayCount);
                    const actualAttendance = attendanceMap.get(emp.id) || 0;

                    // Absent = Expected - Actual
                    // Actual includes PRESENT, LATE, HALF_DAY, and ON_LEAVE (created by approved leave)
                    absentDays = Math.max(0, expectedAttendance - actualAttendance);
                }

                const leaves = leaveTypes.map((lt) => {
                    const used = usedLeavesMap.get(`${emp.id}-${lt.id}`) || 0;
                    const remaining = balances[lt.id] || 0;

                    return {
                        leaveTypeId: lt.id,
                        leaveTypeName: lt.name,
                        code: lt.code,
                        color: lt.color,
                        total: used + remaining,
                        used: used,
                        remaining: remaining,
                    };
                });

                // Calculate total used (Approved Leaves only)
                // Note: We track Absent Days separately, but leave "totalUsed" strictly for 
                // approved leave requests so that Total = Taken + Remaining.
                const leavesUsedFromRequests = leaves.reduce((sum, l) => sum + l.used, 0);
                const totalUsed = leavesUsedFromRequests;

                const totalRemaining = leaves.reduce((sum, l) => sum + l.remaining, 0);

                const recentLeaves = approvedLeaves
                    .filter((l) => l.employeeId === emp.id)
                    .slice(0, 5) // Last 5 leaves
                    .map((l) => ({
                        reason: l.reason,
                        totalDays: l.totalDays,
                        startDate: l.startDate,
                        endDate: l.endDate,
                        leaveTypeName: l.leaveType?.name || 'Leave',
                        color: l.leaveType?.color || '#4F46E5',
                    }));

                return {
                    ...emp,
                    leaveSummary: {
                        details: leaves,
                        totalUsed, // Now includes absent days
                        totalRemaining,
                        absentDays, // Optional: Helpful if frontend wants to show split
                        recentLeaves,
                    }
                };
            });
        }

        return {
            items,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: string, companyId: string) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, companyId },
            include: {
                department: { select: { id: true, name: true, code: true } },
                designation: { select: { id: true, name: true } },
                shift: true,
                manager: { select: { id: true, firstName: true, lastName: true } },
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        status: true,
                        twoFactorEnabled: true,
                        lastLoginAt: true,
                    },
                },
            },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        return employee;
    }

    async update(id: string, companyId: string, dto: UpdateEmployeeDto) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, companyId },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        // Check for unique constraints if updating
        if (dto.email && dto.email !== employee.email) {
            const existingByEmail = await this.prisma.employee.findFirst({
                where: { companyId, email: dto.email.toLowerCase(), id: { not: id } },
            });
            if (existingByEmail) {
                throw new ConflictException('Email already in use');
            }
        }

        if (dto.employeeCode && dto.employeeCode !== employee.employeeCode) {
            const existingByCode = await this.prisma.employee.findFirst({
                where: { companyId, employeeCode: dto.employeeCode, id: { not: id } },
            });
            if (existingByCode) {
                throw new ConflictException('Employee code already in use');
            }
        }

        const updated = await this.prisma.employee.update({
            where: { id },
            data: {
                ...dto,
                email: dto.email?.toLowerCase(),
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
                dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined,
                dateOfLeaving: dto.dateOfLeaving ? new Date(dto.dateOfLeaving) : undefined,
            },
            include: {
                department: { select: { id: true, name: true } },
                designation: { select: { id: true, name: true } },
                shift: { select: { id: true, name: true } },
            },
        });

        // Update user email if changed
        if (dto.email && employee.email !== dto.email.toLowerCase()) {
            await this.prisma.user.updateMany({
                where: { employeeId: id },
                data: { email: dto.email.toLowerCase() },
            });
        }

        return updated;
    }

    async deactivate(id: string, companyId: string) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, companyId },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        await this.prisma.$transaction([
            this.prisma.employee.update({
                where: { id },
                data: {
                    isActive: false,
                    dateOfLeaving: new Date(),
                },
            }),
            this.prisma.user.updateMany({
                where: { employeeId: id },
                data: { status: 'INACTIVE' },
            }),
        ]);

        return { message: 'Employee deactivated successfully' };
    }

    async reactivate(id: string, companyId: string) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, companyId },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        await this.prisma.$transaction([
            this.prisma.employee.update({
                where: { id },
                data: {
                    isActive: true,
                    dateOfLeaving: null,
                },
            }),
            this.prisma.user.updateMany({
                where: { employeeId: id },
                data: { status: 'ACTIVE' },
            }),
        ]);

        return { message: 'Employee reactivated successfully' };
    }

    async getLeaveBalances(id: string, companyId: string) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, companyId },
            select: { leaveBalances: true },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        const leaveTypes = await this.prisma.leaveType.findMany({
            where: { companyId, isActive: true },
        });

        const balances = employee.leaveBalances as Record<string, number>;

        return leaveTypes.map((lt) => ({
            leaveTypeId: lt.id,
            leaveTypeName: lt.name,
            code: lt.code,
            color: lt.color,
            total: lt.defaultDays,
            used: lt.defaultDays - (balances[lt.id] || 0),
            remaining: balances[lt.id] || 0,
        }));
    }

    async updateLeaveBalance(
        id: string,
        companyId: string,
        leaveTypeId: string,
        adjustment: number,
        reason?: string,
    ) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, companyId },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        const balances = employee.leaveBalances as Record<string, number>;
        const currentBalance = balances[leaveTypeId] || 0;
        const newBalance = adjustment;

        if (newBalance < 0) {
            throw new BadRequestException('Leave balance cannot be negative');
        }

        balances[leaveTypeId] = newBalance;

        await this.prisma.employee.update({
            where: { id },
            data: { leaveBalances: balances },
        });

        return {
            leaveTypeId,
            previousBalance: currentBalance,
            newBalance,
            reason,
        };
    }

    async getAttendanceHistory(id: string, companyId: string, startDate?: string, endDate?: string) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, companyId },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        const where: any = { employeeId: id };

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        return this.prisma.attendanceRecord.findMany({
            where,
            orderBy: { date: 'desc' },
            take: 100,
        });
    }

    async getStats(companyId: string) {
        const [total, active, departments] = await Promise.all([
            this.prisma.employee.count({ where: { companyId } }),
            this.prisma.employee.count({ where: { companyId, isActive: true } }),
            this.prisma.employee.groupBy({
                by: ['departmentId'],
                where: { companyId, isActive: true },
                _count: true,
            }),
        ]);

        return {
            total,
            active,
            inactive: total - active,
            byDepartment: departments,
        };
    }

    private generateTempPassword(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
}
