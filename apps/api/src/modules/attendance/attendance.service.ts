import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WinstonLoggerService } from '../../common/services/logger.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { ManualAttendanceDto } from './dto/manual-attendance.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { CreateRegularizationDto } from './dto/create-regularization.dto';
import { UpdateRegularizationDto, RegularizationStatus } from './dto/update-regularization.dto';
import {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    differenceInMinutes,
    parseISO,
    format,
    differenceInBusinessDays,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { AttendanceStatus, AttendanceType } from '@prisma/client';

@Injectable()
export class AttendanceService {
    constructor(
        private prisma: PrismaService,
        private logger: WinstonLoggerService,
    ) { }

    // ==================== CHECK IN ====================

    async checkIn(employeeId: string, companyId: string, dto: CheckInDto) {
        // Get employee with shift and company settings
        const employee = await this.prisma.employee.findFirst({
            where: { id: employeeId, companyId, isActive: true },
            include: {
                shift: true,
                company: {
                    select: {
                        timezone: true,
                        graceTimeMinutes: true,
                        requireGpsTracking: true
                    }
                },
            },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        const timezone = employee.company.timezone || 'UTC';
        const now = new Date();
        const zonedNow = toZonedTime(now, timezone);
        const today = startOfDay(zonedNow);
        const todayUtc = fromZonedTime(today, timezone);

        // Check if already checked in today
        const existingRecord = await this.prisma.attendanceRecord.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date: todayUtc,
                },
            },
        });

        if (existingRecord?.checkInTime) {
            throw new BadRequestException('Already checked in today');
        }

        // Determine attendance type
        let attendanceType: AttendanceType = dto.type || AttendanceType.OFFICE;

        // Geo-fencing Validation
        // Fetch office locations
        const officeLocations = await this.prisma.officeLocation.findMany({
            where: { companyId, isActive: true }
        });

        // If company requires GPS or if we want to validate OFFICE attendance
        if (officeLocations.length > 0) {
            // If checking in as OFFICE, enforce location check
            if (attendanceType === AttendanceType.OFFICE) {
                if (!dto.location || !dto.location.lat || !dto.location.lng) {
                    // If strict mode is on, fail. Otherwise might warn or allow if configured (here we assume strict for Office)
                    if (employee.company.requireGpsTracking) {
                        throw new BadRequestException('GPS location is required for Office check-in.');
                    }
                } else {
                    let isWithinRange = false;

                    for (const loc of officeLocations) {
                        const distance = this.calculateDistance(
                            dto.location.lat,
                            dto.location.lng,
                            loc.latitude,
                            loc.longitude
                        );
                        if (distance <= loc.radius) {
                            isWithinRange = true;
                            break;
                        }
                    }

                    if (!isWithinRange) {
                        // If strict GPS is required OR they selected OFFICE type but aren't there
                        if (employee.company.requireGpsTracking) {
                            throw new BadRequestException('You are not within the designated office location radius.');
                        }
                        // If strict is false, maybe we allow it? For now, let's strictly enforce if they claim OFFICE.
                        // Or prompt user to change type to REMOTE.
                        // For "Copy Zoho", usually it restricts you.
                        throw new BadRequestException('You are outside the office geofence. Please mark attendance as Remote/Field if allowed.');
                    }
                }
            }
        }

        // Calculate late minutes based on shift
        let lateMinutes = 0;

        // Use assigned shift or fallback to default company shift
        let activeShift = employee.shift;
        if (!activeShift) {
            activeShift = await this.prisma.shift.findFirst({
                where: { companyId, isDefault: true, isActive: true }
            });
        }

        if (activeShift) {
            const [shiftHour, shiftMinute] = activeShift.startTime.split(':').map(Number);
            const shiftStart = new Date(zonedNow);
            shiftStart.setHours(shiftHour, shiftMinute, 0, 0);

            const graceTime = activeShift.graceTimeIn || employee.company.graceTimeMinutes || 15;
            const effectiveStart = new Date(shiftStart.getTime() + graceTime * 60000);

            if (zonedNow > effectiveStart) {
                lateMinutes = differenceInMinutes(zonedNow, shiftStart);
            }
        }

        // Create or update attendance record
        const record = await this.prisma.attendanceRecord.upsert({
            where: {
                employeeId_date: {
                    employeeId,
                    date: todayUtc,
                },
            },
            create: {
                companyId,
                employeeId,
                date: todayUtc,
                checkInTime: now,
                checkInLocation: dto.location ? { lat: dto.location.lat, lng: dto.location.lng, address: dto.location.address } : undefined,
                checkInIp: dto.ipAddress,
                checkInDevice: dto.deviceInfo,
                checkInNote: dto.note,
                status: AttendanceStatus.PRESENT,
                type: attendanceType,
                workLocation: dto.workLocation || (attendanceType === 'OFFICE' ? 'OFFICE' : 'HOME'),
                lateMinutes,
            },
            update: {
                checkInTime: now,
                checkInLocation: dto.location ? { lat: dto.location.lat, lng: dto.location.lng, address: dto.location.address } : undefined,
                checkInIp: dto.ipAddress,
                checkInDevice: dto.deviceInfo,
                checkInNote: dto.note,
                status: AttendanceStatus.PRESENT,
                type: attendanceType,
                workLocation: dto.workLocation || (attendanceType === 'OFFICE' ? 'OFFICE' : 'HOME'),
                lateMinutes,
            },
        });

        this.logger.log(`Employee ${employeeId} checked in`, 'AttendanceService');

        return {
            message: 'Checked in successfully',
            record: {
                id: record.id,
                checkInTime: record.checkInTime,
                status: record.status,
                lateMinutes: record.lateMinutes,
            },
        };
    }

    // ==================== CHECK OUT ====================

    async checkOut(employeeId: string, companyId: string, dto: CheckOutDto) {
        const employee = await this.prisma.employee.findFirst({
            where: { id: employeeId, companyId, isActive: true },
            include: {
                shift: true,
                company: { select: { timezone: true, overtimeThresholdMinutes: true } },
            },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        const timezone = employee.company.timezone || 'UTC';
        const now = new Date();
        const zonedNow = toZonedTime(now, timezone);
        const today = startOfDay(zonedNow);
        const todayUtc = fromZonedTime(today, timezone);

        // Get today's attendance record
        const record = await this.prisma.attendanceRecord.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date: todayUtc,
                },
            },
        });

        if (!record) {
            throw new BadRequestException('No check-in record found for today');
        }

        if (!record.checkInTime) {
            throw new BadRequestException('Please check in first');
        }

        if (record.checkOutTime) {
            throw new BadRequestException('Already checked out today');
        }

        if (record.isLocked) {
            throw new ForbiddenException('Attendance record is locked');
        }

        // Calculate work duration and overtime
        const totalWorkMinutes = differenceInMinutes(now, record.checkInTime) - record.totalBreakMinutes;

        let overtimeMinutes = 0;
        let earlyLeaveMinutes = 0;
        let lateMinutes = record.lateMinutes; // Start with existing lateness

        // Use assigned shift or fallback to default company shift
        let activeShift = employee.shift;
        if (!activeShift) {
            activeShift = await this.prisma.shift.findFirst({
                where: { companyId, isDefault: true, isActive: true }
            });
        }

        if (activeShift) {
            const [startHour, startMinute] = activeShift.startTime.split(':').map(Number);
            const [endHour, endMinute] = activeShift.endTime.split(':').map(Number);
            const shiftEnd = new Date(zonedNow);
            shiftEnd.setHours(endHour, endMinute, 0, 0);

            // Calculate expected shift duration (e.g. 9 hours)
            let shiftDuration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
            if (shiftDuration < 0) shiftDuration += 24 * 60;

            // RULE: If they worked the full shift hours (or more), forgive lateness
            // DISABLED: User wants to track punctuality strictly matching the UI warnings.
            // if (totalWorkMinutes >= shiftDuration) {
            //     lateMinutes = 0;
            // }

            const standardMinutes = employee.company.overtimeThresholdMinutes || 480;

            if (totalWorkMinutes > standardMinutes) {
                overtimeMinutes = totalWorkMinutes - standardMinutes;
            }

            if (zonedNow < shiftEnd && totalWorkMinutes < shiftDuration) {
                earlyLeaveMinutes = differenceInMinutes(shiftEnd, zonedNow);
            }
        }

        // Determine status
        let status = record.status;
        if (activeShift?.halfDayThreshold && totalWorkMinutes < activeShift.halfDayThreshold) {
            status = AttendanceStatus.HALF_DAY;
        }
        // If lateness forgiven or full day worked
        if (lateMinutes === 0 && status === AttendanceStatus.HALF_DAY && totalWorkMinutes >= (activeShift?.halfDayThreshold || 0) * 2) {
            status = AttendanceStatus.PRESENT;
        }

        const updatedRecord = await this.prisma.attendanceRecord.update({
            where: { id: record.id },
            data: {
                checkOutTime: now,
                checkOutLocation: dto.location ? { lat: dto.location.lat, lng: dto.location.lng } : undefined,
                checkOutIp: dto.ipAddress,
                checkOutDevice: dto.deviceInfo,
                checkOutNote: dto.note,
                totalWorkMinutes,
                overtimeMinutes,
                earlyLeaveMinutes,
                lateMinutes, // Update with forgiven value
                status,
            },
        });

        this.logger.log(`Employee ${employeeId} checked out`, 'AttendanceService');

        return {
            message: 'Checked out successfully',
            record: {
                id: updatedRecord.id,
                checkInTime: updatedRecord.checkInTime,
                checkOutTime: updatedRecord.checkOutTime,
                totalWorkMinutes: updatedRecord.totalWorkMinutes,
                overtimeMinutes: updatedRecord.overtimeMinutes,
                status: updatedRecord.status,
            },
        };
    }

    // ==================== BREAK TRACKING ====================

    async startBreak(employeeId: string, companyId: string) {
        const today = startOfDay(new Date());

        const record = await this.prisma.attendanceRecord.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date: today,
                },
            },
        });

        if (!record || !record.checkInTime) {
            throw new BadRequestException('Please check in first');
        }

        if (record.checkOutTime) {
            throw new BadRequestException('Already checked out');
        }

        const breaks = (record.breaks as any[]) || [];
        const lastBreak = breaks[breaks.length - 1];

        if (lastBreak && !lastBreak.end) {
            throw new BadRequestException('Please end your current break first');
        }

        breaks.push({
            start: new Date().toISOString(),
            end: null,
            duration: 0,
        });

        await this.prisma.attendanceRecord.update({
            where: { id: record.id },
            data: { breaks },
        });

        return { message: 'Break started' };
    }

    async endBreak(employeeId: string, companyId: string) {
        const today = startOfDay(new Date());

        const record = await this.prisma.attendanceRecord.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date: today,
                },
            },
        });

        if (!record) {
            throw new BadRequestException('No attendance record found');
        }

        const breaks = (record.breaks as any[]) || [];
        const lastBreak = breaks[breaks.length - 1];

        if (!lastBreak || lastBreak.end) {
            throw new BadRequestException('No active break found');
        }

        const now = new Date();
        lastBreak.end = now.toISOString();
        lastBreak.duration = differenceInMinutes(now, new Date(lastBreak.start));

        const totalBreakMinutes = breaks.reduce(
            (sum, b) => sum + (b.duration || 0),
            0,
        );

        await this.prisma.attendanceRecord.update({
            where: { id: record.id },
            data: {
                breaks,
                totalBreakMinutes,
            },
        });

        return { message: 'Break ended', duration: lastBreak.duration };
    }

    // ==================== TODAY'S STATUS ====================

    async getTodayStatus(employeeId: string, companyId: string) {
        const employee = await this.prisma.employee.findFirst({
            where: { id: employeeId, companyId, isActive: true },
            include: {
                shift: true,
                company: { select: { timezone: true } },
            },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        const timezone = employee.company.timezone || 'UTC';
        const zonedNow = toZonedTime(new Date(), timezone);
        const today = startOfDay(zonedNow);
        const todayUtc = fromZonedTime(today, timezone);
        const record = await this.prisma.attendanceRecord.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date: todayUtc,
                },
            },
        });


        // Check if today is a holiday
        // Check if today is a holiday
        const holiday = await this.prisma.holiday.findFirst({
            where: {
                companyId,
                date: todayUtc,
            },
        });

        // Use assigned shift or fallback to default
        let activeShift = employee.shift;
        if (!activeShift) {
            activeShift = await this.prisma.shift.findFirst({
                where: { companyId, isDefault: true, isActive: true }
            });
        }

        // Check if today is a weekend
        const dayOfWeek = zonedNow.getDay();
        const isWeekend = activeShift
            ? !activeShift.workingDays.includes(dayOfWeek)
            : dayOfWeek === 0 || dayOfWeek === 6;

        // Check for approved leave
        const leave = await this.prisma.leave.findFirst({
            where: {
                employeeId,
                status: 'APPROVED',
                startDate: { lte: todayUtc },
                endDate: { gte: todayUtc },
            },
            include: { leaveType: true },
        });

        return {
            date: format(zonedNow, 'yyyy-MM-dd'),
            employee: {
                id: employee.id,
                name: `${employee.firstName} ${employee.lastName}`,
                shift: activeShift
                    ? {
                        name: activeShift.name,
                        startTime: activeShift.startTime,
                        endTime: activeShift.endTime,
                    }
                    : null,
            },
            attendance: record
                ? {
                    id: record.id,
                    checkInTime: record.checkInTime,
                    checkOutTime: record.checkOutTime,
                    status: record.status,
                    type: record.type,
                    totalWorkMinutes: record.totalWorkMinutes,
                    lateMinutes: record.lateMinutes,
                    overtimeMinutes: record.overtimeMinutes,
                    breaks: record.breaks,
                    isOnBreak: this.isOnBreak(record.breaks as any[]),
                }
                : null,
            holiday: holiday
                ? { name: holiday.name, type: holiday.type }
                : null,
            isWeekend,
            leave: leave
                ? {
                    id: leave.id,
                    type: leave.leaveType.name,
                    startDate: leave.startDate,
                    endDate: leave.endDate,
                }
                : null,
        };
    }

    private isOnBreak(breaks: any[]): boolean {
        if (!breaks || breaks.length === 0) return false;
        const lastBreak = breaks[breaks.length - 1];
        return lastBreak && !lastBreak.end;
    }

    // ==================== ATTENDANCE HISTORY ====================

    async getHistory(
        companyId: string,
        query: AttendanceQueryDto,
        requestingUser: any,
    ) {
        const {
            employeeId,
            departmentId,
            startDate,
            endDate,
            status,
            page = 1,
            limit = 20,
        } = query;

        const skip = (page - 1) * limit;

        const where: any = { companyId };

        // Filter by employee
        if (employeeId) {
            // Employees can only view their own records
            if (requestingUser.role === 'EMPLOYEE' && requestingUser.employee?.id !== employeeId) {
                throw new ForbiddenException('You can only view your own attendance');
            }
            where.employeeId = employeeId;
        } else if (requestingUser.role === 'EMPLOYEE') {
            where.employeeId = requestingUser.employee?.id;
        }

        // Filter by department
        if (departmentId) {
            where.employee = { departmentId };
        }

        // Filter by date range
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        // Filter by status
        if (status) {
            where.status = status;
        }

        const [records, total] = await Promise.all([
            this.prisma.attendanceRecord.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date: 'desc' },
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                            department: { select: { name: true } },
                            shift: { select: { name: true, startTime: true, endTime: true, graceTimeIn: true } },
                        },
                    },
                },
            }),
            this.prisma.attendanceRecord.count({ where }),
        ]);

        // Calculate summary stats
        const [presentCount, halfDayCount, absentCount, onLeaveCount, lateRecordsCandidates] = await Promise.all([
            this.prisma.attendanceRecord.count({
                where: { ...where, status: 'PRESENT' }
            }),
            this.prisma.attendanceRecord.count({
                where: { ...where, status: 'HALF_DAY' }
            }),
            this.prisma.attendanceRecord.count({
                where: { ...where, status: 'ABSENT' }
            }),
            this.prisma.attendanceRecord.count({
                where: { ...where, status: 'ON_LEAVE' }
            }),
            // Fetch all records for late calculation (to match frontend dynamic logic)
            this.prisma.attendanceRecord.findMany({
                where,
                select: {
                    checkInTime: true,
                    employee: {
                        select: {
                            shift: {
                                select: { startTime: true, graceTimeIn: true }
                            },
                            company: { select: { graceTimeMinutes: true } }
                        }
                    }
                }
            })
        ]);

        // Calculate late count dynamically
        const lateCount = (lateRecordsCandidates as any[]).filter(r => {
            if (!r.checkInTime || !r.employee?.shift?.startTime) return false;

            const [h, m] = r.employee.shift.startTime.split(':').map(Number);
            const shiftDate = new Date(r.checkInTime);
            shiftDate.setHours(h, m, 0, 0);

            const diff = (new Date(r.checkInTime).getTime() - shiftDate.getTime()) / 60000;
            // Use shift grace time or company default or 15
            const grace = r.employee.shift.graceTimeIn ?? r.employee.company?.graceTimeMinutes ?? 15;

            return diff > grace;
        }).length;

        // Calculate calculated absent days if range is provided
        let calculatedAbsent = 0;
        if (startDate && endDate) {
            const start = new Date(startDate);
            const queryEnd = new Date(endDate);
            const now = new Date();
            // Cap end date at today if looking at future to avoid counting future days as absent
            const end = queryEnd > now ? now : queryEnd;

            // 1. Calculate Working Days (Business Days - Holidays)
            const businessDays = differenceInBusinessDays(end, start) + 1;

            const holidayCount = await this.prisma.holiday.count({
                where: {
                    companyId,
                    date: { gte: start, lte: end }
                }
            });

            const workingDays = Math.max(0, businessDays - holidayCount);

            // 2. Count Employees in Scope
            const empWhere: any = { companyId, isActive: true };
            if (where.employeeId) empWhere.id = where.employeeId;
            if (where.employee?.departmentId) empWhere.departmentId = where.employee.departmentId;

            const relevantEmployeeCount = await this.prisma.employee.count({ where: empWhere });

            // 3. Expected Total Records
            const expectedRecords = relevantEmployeeCount * workingDays;

            // 4. Actual Records (Present + HalfDay + OnLeave)
            if (!status) {
                const actualattendance = presentCount + halfDayCount + onLeaveCount;
                calculatedAbsent = Math.max(0, expectedRecords - actualattendance);
            }
        }

        return {
            items: records,
            summary: {
                present: presentCount + halfDayCount,
                absent: absentCount + calculatedAbsent,
                late: lateCount,
                onLeave: onLeaveCount,
            },
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // ==================== MANUAL ENTRY (HR/Admin) ====================

    async createManualEntry(
        companyId: string,
        dto: ManualAttendanceDto,
        createdBy: string,
    ) {
        const employee = await this.prisma.employee.findFirst({
            where: { id: dto.employeeId, companyId, isActive: true },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        const date = new Date(dto.date);
        const dateOnly = startOfDay(date);

        // Check for existing record
        const existing = await this.prisma.attendanceRecord.findUnique({
            where: {
                employeeId_date: {
                    employeeId: dto.employeeId,
                    date: dateOnly,
                },
            },
        });

        if (existing && existing.isLocked) {
            throw new ForbiddenException('Attendance record is locked');
        }

        // Calculate work minutes
        let totalWorkMinutes = 0;
        if (dto.checkInTime && dto.checkOutTime) {
            totalWorkMinutes = differenceInMinutes(
                new Date(dto.checkOutTime),
                new Date(dto.checkInTime),
            );
        }

        const record = await this.prisma.attendanceRecord.upsert({
            where: {
                employeeId_date: {
                    employeeId: dto.employeeId,
                    date: dateOnly,
                },
            },
            create: {
                companyId,
                employeeId: dto.employeeId,
                date: dateOnly,
                checkInTime: dto.checkInTime ? new Date(dto.checkInTime) : null,
                checkOutTime: dto.checkOutTime ? new Date(dto.checkOutTime) : null,
                status: dto.status || AttendanceStatus.PRESENT,
                type: dto.type || AttendanceType.OFFICE,
                totalWorkMinutes,
                lateMinutes: dto.lateMinutes || 0,
                overtimeMinutes: dto.overtimeMinutes || 0,
                isManualEntry: true,
                manualEntryReason: dto.reason,
            },
            update: {
                checkInTime: dto.checkInTime ? new Date(dto.checkInTime) : null,
                checkOutTime: dto.checkOutTime ? new Date(dto.checkOutTime) : null,
                status: dto.status,
                type: dto.type,
                totalWorkMinutes,
                lateMinutes: dto.lateMinutes,
                overtimeMinutes: dto.overtimeMinutes,
                isManualEntry: true,
                manualEntryReason: dto.reason,
            },
        });

        this.logger.log(
            `Manual attendance entry created for ${dto.employeeId} by ${createdBy}`,
            'AttendanceService',
        );

        return record;
    }

    // ==================== APPROVAL & LOCKING ====================

    async approveAttendance(recordId: string, approverId: string, companyId: string) {
        const record = await this.prisma.attendanceRecord.findFirst({
            where: { id: recordId, companyId },
        });

        if (!record) {
            throw new NotFoundException('Attendance record not found');
        }

        return this.prisma.attendanceRecord.update({
            where: { id: recordId },
            data: {
                isApproved: true,
                approvedBy: approverId,
                approvedAt: new Date(),
            },
        });
    }

    async lockAttendance(recordId: string, companyId: string) {
        const record = await this.prisma.attendanceRecord.findFirst({
            where: { id: recordId, companyId },
        });

        if (!record) {
            throw new NotFoundException('Attendance record not found');
        }

        if (!record.isApproved) {
            throw new BadRequestException('Attendance must be approved before locking');
        }

        return this.prisma.attendanceRecord.update({
            where: { id: recordId },
            data: {
                isLocked: true,
                lockedAt: new Date(),
            },
        });
    }

    async bulkLockAttendance(
        companyId: string,
        startDate: string,
        endDate: string,
    ) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const result = await this.prisma.attendanceRecord.updateMany({
            where: {
                companyId,
                date: { gte: start, lte: end },
                isApproved: true,
                isLocked: false,
            },
            data: {
                isLocked: true,
                lockedAt: new Date(),
            },
        });

        return {
            message: `${result.count} attendance records locked`,
            count: result.count,
        };
    }

    // ==================== STATISTICS ====================

    async getDashboardStats(companyId: string, date?: string) {
        const targetDate = date ? new Date(date) : new Date();
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);
        const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
        const monthStart = startOfMonth(targetDate);
        const monthEnd = endOfMonth(targetDate);

        // Get total active employees
        const totalEmployees = await this.prisma.employee.count({
            where: { companyId, isActive: true },
        });

        // Today's stats
        const todayRecords = await this.prisma.attendanceRecord.findMany({
            where: { companyId, date: dayStart },
        });

        const presentToday = todayRecords.filter(
            (r) => r.status === 'PRESENT' || r.status === 'HALF_DAY',
        ).length;
        const lateToday = todayRecords.filter((r) => r.lateMinutes > 0).length;
        const onLeaveToday = await this.prisma.leave.count({
            where: {
                companyId,
                status: 'APPROVED',
                startDate: { lte: dayStart },
                endDate: { gte: dayStart },
            },
        });

        // Weekly stats
        const weeklyRecords = await this.prisma.attendanceRecord.groupBy({
            by: ['status'],
            where: {
                companyId,
                date: { gte: weekStart, lte: weekEnd },
            },
            _count: true,
        });

        // Monthly attendance rate
        const monthlyAttendance = await this.prisma.attendanceRecord.count({
            where: {
                companyId,
                date: { gte: monthStart, lte: monthEnd },
                status: { in: ['PRESENT', 'HALF_DAY'] },
            },
        });

        const workingDaysInMonth = this.getWorkingDaysCount(monthStart, targetDate);
        const expectedAttendance = totalEmployees * workingDaysInMonth;
        const attendanceRate =
            expectedAttendance > 0 ? (monthlyAttendance / expectedAttendance) * 100 : 0;

        return {
            today: {
                date: format(targetDate, 'yyyy-MM-dd'),
                totalEmployees,
                present: presentToday,
                absent: totalEmployees - presentToday - onLeaveToday,
                late: lateToday,
                onLeave: onLeaveToday,
                attendanceRate:
                    totalEmployees > 0
                        ? ((presentToday / totalEmployees) * 100).toFixed(1)
                        : 0,
            },
            weekly: {
                startDate: format(weekStart, 'yyyy-MM-dd'),
                endDate: format(weekEnd, 'yyyy-MM-dd'),
                breakdown: weeklyRecords,
            },
            monthly: {
                month: format(targetDate, 'MMMM yyyy'),
                totalAttendance: monthlyAttendance,
                attendanceRate: attendanceRate.toFixed(1),
                workingDays: workingDaysInMonth,
            },
        };
    }

    private getWorkingDaysCount(start: Date, end: Date): number {
        let count = 0;
        const current = new Date(start);

        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }

        return count;
    }


    // ==================== REGULARIZATION ====================

    async createRegularization(companyId: string, employeeId: string, dto: CreateRegularizationDto) {
        // Use UTC Noon to prevent timezone truncation
        const [year, month, day] = dto.date.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        const dayStart = date;

        // Check if request already exists
        const existing = await this.prisma.regularizationRequest.findFirst({
            where: {
                companyId,
                employeeId,
                date: dayStart,
                status: 'PENDING'
            }
        });

        if (existing) {
            throw new BadRequestException('A pending request for this date already exists');
        }

        return this.prisma.regularizationRequest.create({
            data: {
                companyId,
                employeeId,
                date: dayStart,
                checkInTime: dto.checkInTime ? new Date(dto.checkInTime) : null,
                checkOutTime: dto.checkOutTime ? new Date(dto.checkOutTime) : null,
                reason: dto.reason,
                status: 'PENDING'
            }
        });
    }

    async getRegularizationRequests(companyId: string, employeeId?: string, status?: string) {
        return this.prisma.regularizationRequest.findMany({
            where: {
                companyId,
                employeeId,
                status
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateRegularization(
        companyId: string,
        requestId: string,
        dto: UpdateRegularizationDto,
        approverId: string
    ) {
        console.log('HIT updateRegularization', { requestId, status: dto.status });
        const request = await this.prisma.regularizationRequest.findUnique({
            where: { id: requestId, companyId }
        });

        if (!request) {
            throw new NotFoundException('Request not found');
        }

        if (request.status !== 'PENDING') {
            throw new BadRequestException('Request is already processed');
        }

        const updated = await this.prisma.regularizationRequest.update({
            where: { id: requestId },
            data: {
                status: dto.status,
                approverId,
                rejectionReason: dto.rejectionReason,
                updatedAt: new Date()
            }
        });

        if (dto.status === RegularizationStatus.APPROVED) {
            // Update attendance record
            // Fetch records within +/- 2 days to ensure we catch timezone-shifted records
            // This is safer than 'take: 10' and avoids strict DB equality issues.
            const { subDays, addDays, isSameDay, differenceInMinutes } = require('date-fns');
            const searchDate = new Date(request.date);
            const recentRecords = await this.prisma.attendanceRecord.findMany({
                where: {
                    employeeId: request.employeeId,
                    date: {
                        gte: subDays(searchDate, 2),
                        lte: addDays(searchDate, 2)
                    }
                },
                orderBy: { date: 'desc' }
            });

            console.log('HIT updateRegularization', { id: requestId, matches: recentRecords.length });

            // Use date-fns isSameDay to compare
            const matchingRecords = recentRecords.filter(r =>
                isSameDay(new Date(r.date), new Date(request.date))
            );

            // Extract best times from matching records
            const existingCheckIn = matchingRecords.find(r => r.checkInTime)?.checkInTime;
            const existingCheckOut = matchingRecords.find(r => r.checkOutTime)?.checkOutTime;

            // Merge with Request
            // IMPORTANT: If request param is null, we try to keep existing.
            const finalCheckIn = request.checkInTime || existingCheckIn;
            const finalCheckOut = request.checkOutTime || existingCheckOut;

            let totalWorkMinutes = 0;
            let lateMinutes = 0;

            if (finalCheckIn && finalCheckOut) {
                const diff = differenceInMinutes(finalCheckOut, finalCheckIn);
                totalWorkMinutes = diff > 0 ? diff : 0;
                if (matchingRecords[0]?.totalBreakMinutes) {
                    totalWorkMinutes -= matchingRecords[0].totalBreakMinutes;
                }
            }

            if (finalCheckIn) {
                const employee = await this.prisma.employee.findUnique({
                    where: { id: request.employeeId },
                    include: { shift: true }
                });

                if (employee?.shift) {
                    const [h, m] = employee.shift.startTime.split(':').map(Number);
                    const shiftStart = new Date(finalCheckIn);
                    shiftStart.setHours(h, m, 0, 0);

                    const lateDiff = differenceInMinutes(finalCheckIn, shiftStart);
                    if (lateDiff > (employee.shift.graceTimeIn || 0)) {
                        lateMinutes = lateDiff;
                    }
                }
            }

            // Build Data Object carefully. Use undefined to avoid overwriting with null during UPDATE.
            const commonData: any = {
                status: AttendanceStatus.PRESENT,
                isManualEntry: true,
                manualEntryReason: `Regularization approved: ${request.reason}`,
                totalWorkMinutes,
                lateMinutes
            };

            // Only set these if they exist. For update, omitting means key is NOT touched.
            if (finalCheckIn) commonData.checkInTime = finalCheckIn;
            if (finalCheckOut) commonData.checkOutTime = finalCheckOut;

            if (matchingRecords.length > 0) {
                // Update the FIRST record
                const primaryRecord = matchingRecords[0];
                await this.prisma.attendanceRecord.update({
                    where: { id: primaryRecord.id },
                    data: commonData
                });

                // DELETE duplicates if any
                if (matchingRecords.length > 1) {
                    const idsToDelete = matchingRecords.slice(1).map(r => r.id);
                    await this.prisma.attendanceRecord.deleteMany({
                        where: { id: { in: idsToDelete } }
                    });
                }
            } else {
                await this.prisma.attendanceRecord.create({
                    data: {
                        companyId,
                        employeeId: request.employeeId,
                        date: request.date,
                        type: AttendanceType.OFFICE,
                        ...commonData
                    }
                });
            }
        }

        return updated;
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
}
