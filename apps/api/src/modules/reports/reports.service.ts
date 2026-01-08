import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getAttendanceReport(companyId: string, startDate: string, endDate: string, departmentId?: string) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const where: any = {
            companyId,
            date: { gte: start, lte: end },
        };

        if (departmentId) {
            where.employee = { departmentId };
        }

        const records = await this.prisma.attendanceRecord.findMany({
            where,
            include: {
                employee: {
                    select: { firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } },
                },
            },
            orderBy: [{ date: 'asc' }, { employeeId: 'asc' }],
        });

        // Summary statistics
        const summary = {
            totalRecords: records.length,
            present: records.filter(r => r.status === 'PRESENT').length,
            absent: records.filter(r => r.status === 'ABSENT').length,
            halfDay: records.filter(r => r.status === 'HALF_DAY').length,
            onLeave: records.filter(r => r.status === 'ON_LEAVE').length,
            totalLateMinutes: records.reduce((sum, r) => sum + r.lateMinutes, 0),
            totalOvertimeMinutes: records.reduce((sum, r) => sum + r.overtimeMinutes, 0),
        };

        return { records, summary, dateRange: { start, end } };
    }

    async getLeaveReport(companyId: string, startDate: string, endDate: string) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const leaves = await this.prisma.leave.findMany({
            where: {
                companyId,
                status: 'APPROVED',
                startDate: { gte: start },
                endDate: { lte: end },
            },
            include: {
                employee: { select: { firstName: true, lastName: true, employeeCode: true } },
                leaveType: { select: { name: true, code: true } },
            },
        });

        // Group by leave type
        const byLeaveType = await this.prisma.leave.groupBy({
            by: ['leaveTypeId'],
            where: { companyId, status: 'APPROVED', startDate: { gte: start }, endDate: { lte: end } },
            _sum: { totalDays: true },
            _count: true,
        });

        return { leaves, byLeaveType, dateRange: { start, end } };
    }

    async getDepartmentReport(companyId: string, month: number, year: number) {
        const start = startOfMonth(new Date(year, month - 1));
        const end = endOfMonth(new Date(year, month - 1));

        const departments = await this.prisma.department.findMany({
            where: { companyId, isActive: true },
            select: { id: true, name: true },
        });

        const results = await Promise.all(
            departments.map(async (dept) => {
                const employeeCount = await this.prisma.employee.count({
                    where: { companyId, departmentId: dept.id, isActive: true },
                });

                const attendance = await this.prisma.attendanceRecord.aggregate({
                    where: { companyId, employee: { departmentId: dept.id }, date: { gte: start, lte: end } },
                    _count: true,
                    _avg: { totalWorkMinutes: true, lateMinutes: true },
                });

                return {
                    department: dept,
                    employeeCount,
                    totalAttendance: attendance._count,
                    avgWorkMinutes: Math.round(attendance._avg.totalWorkMinutes || 0),
                    avgLateMinutes: Math.round(attendance._avg.lateMinutes || 0),
                };
            }),
        );

        return { departments: results, period: { month, year } };
    }

    async getPayrollSummary(companyId: string, month: number, year: number) {
        const start = startOfMonth(new Date(year, month - 1));
        const end = endOfMonth(new Date(year, month - 1));

        const employees = await this.prisma.employee.findMany({
            where: { companyId, isActive: true },
            include: {
                department: { select: { name: true } },
                designation: { select: { name: true } },
            },
        });

        const summaries = await Promise.all(
            employees.map(async (emp) => {
                const attendance = await this.prisma.attendanceRecord.findMany({
                    where: { employeeId: emp.id, date: { gte: start, lte: end } },
                });

                const leaves = await this.prisma.leave.findMany({
                    where: {
                        employeeId: emp.id,
                        status: 'APPROVED',
                        startDate: { lte: end },
                        endDate: { gte: start },
                    },
                    include: { leaveType: { select: { name: true, isPaid: true } } },
                });

                const presentDays = attendance.filter(a => a.status === 'PRESENT').length;
                const halfDays = attendance.filter(a => a.status === 'HALF_DAY').length;
                const totalWorkMinutes = attendance.reduce((sum, a) => sum + a.totalWorkMinutes, 0);
                const totalOvertimeMinutes = attendance.reduce((sum, a) => sum + a.overtimeMinutes, 0);
                const totalLateMinutes = attendance.reduce((sum, a) => sum + a.lateMinutes, 0);
                const paidLeaveDays = leaves.filter(l => l.leaveType.isPaid).reduce((sum, l) => sum + Number(l.totalDays), 0);
                const unpaidLeaveDays = leaves.filter(l => !l.leaveType.isPaid).reduce((sum, l) => sum + Number(l.totalDays), 0);

                return {
                    employee: {
                        id: emp.id,
                        code: emp.employeeCode,
                        name: `${emp.firstName} ${emp.lastName}`,
                        department: emp.department?.name,
                        designation: emp.designation?.name,
                    },
                    attendance: {
                        presentDays,
                        halfDays,
                        effectiveDays: presentDays + (halfDays * 0.5),
                        totalWorkHours: Math.round(totalWorkMinutes / 60 * 10) / 10,
                        overtimeHours: Math.round(totalOvertimeMinutes / 60 * 10) / 10,
                        lateHours: Math.round(totalLateMinutes / 60 * 10) / 10,
                    },
                    leaves: {
                        paidDays: paidLeaveDays,
                        unpaidDays: unpaidLeaveDays,
                    },
                };
            }),
        );

        return {
            period: { month, year },
            employees: summaries,
            totals: {
                totalEmployees: employees.length,
                totalWorkHours: summaries.reduce((sum, s) => sum + s.attendance.totalWorkHours, 0),
                totalOvertimeHours: summaries.reduce((sum, s) => sum + s.attendance.overtimeHours, 0),
            },
        };
    }

    async getAnalytics(companyId: string, employeeId?: string) {
        const today = new Date();
        const monthStart = startOfMonth(today);
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });

        // Attendance trend (last 7 days)
        const last7Days = eachDayOfInterval({ start: weekStart, end: today });
        const attendanceTrend = await Promise.all(
            last7Days.map(async (day) => {
                const agg = await this.prisma.attendanceRecord.aggregate({
                    where: {
                        companyId,
                        date: day,
                        status: { in: ['PRESENT', 'HALF_DAY', 'ON_LEAVE'] },
                        ...(employeeId && { employeeId })
                    },
                    _count: true,
                    _sum: { totalWorkMinutes: true }
                });
                return {
                    date: format(day, 'yyyy-MM-dd'),
                    day: format(day, 'EEE'),
                    count: agg._count,
                    hours: Math.round((agg._sum?.totalWorkMinutes || 0) / 60 * 10) / 10
                };
            }),
        );

        // Leave distribution
        const leaveDistribution = await this.prisma.leave.groupBy({
            by: ['leaveTypeId'],
            where: {
                companyId,
                status: 'APPROVED',
                startDate: { gte: monthStart },
                ...(employeeId && { employeeId })
            },
            _count: true,
        });

        // Department attendance
        const deptAttendance = employeeId ? [] : await this.prisma.department.findMany({
            where: { companyId, isActive: true },
            select: {
                name: true,
                employees: {
                    where: { isActive: true },
                    select: { _count: { select: { attendanceRecords: { where: { date: today } } } } },
                },
            },
        });

        return {
            attendanceTrend,
            leaveDistribution,
            departmentStats: deptAttendance.map(d => ({
                department: d.name,
                attendanceToday: d.employees.reduce((sum, e) => sum + e._count.attendanceRecords, 0),
            })),
        };
    }
}
