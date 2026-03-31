import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { startOfMonth, endOfMonth, parseISO, isWeekend } from 'date-fns';

@Injectable()
export class MissionStrictService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Get employee monthly summary with daily records.
     * Skips days without checkout (marks them as checkoutMissing).
     */
    async getEmployeeMonthlySummary(companyId: string, employeeId: string, month: string) {
        const startDate = startOfMonth(parseISO(`${month}-01`));
        const endDate = endOfMonth(parseISO(`${month}-01`));

        // Get all attendance records for the month
        const attendanceRecords = await this.prisma.attendanceRecord.findMany({
            where: {
                companyId,
                employeeId,
                date: { gte: startDate, lte: endDate },
                status: 'PRESENT',
            },
            orderBy: { date: 'asc' },
        });

        // Get existing MissionStrict records (for overrides & approval status)
        const existingRecords = await this.prisma.missionStrictRecord.findMany({
            where: {
                companyId,
                employeeId,
                date: { gte: startDate, lte: endDate },
            },
        });

        const recordMap = new Map();
        for (const r of existingRecords) {
            recordMap.set(r.date.toISOString().split('T')[0], r);
        }

        let totalShortMinutes = 0;
        let totalExtraMinutes = 0;

        const dailyRecords = attendanceRecords.map((ar: any) => {
            const dateStr = ar.date.toISOString().split('T')[0];
            const existing = recordMap.get(dateStr);
            const expectedMinutes = 540;
            const checkoutMissing = !ar.checkOutTime;

            // If weekend, skip entirely
            if (isWeekend(ar.date)) {
                return {
                    id: existing?.id || null,
                    date: dateStr,
                    actualMinutes: ar.totalWorkMinutes || 0,
                    expectedMinutes: 0,
                    shortMinutes: 0,
                    extraMinutes: 0,
                    checkoutMissing: false,
                    status: existing?.status || 'PENDING',
                    isOverridden: existing?.isOverridden || false,
                    adminNote: existing?.adminNote || null,
                    leavesAdjusted: existing?.leavesAdjusted || 0,
                    isWeekend: true,
                };
            }

            // If checkout is missing, don't calculate short/extra
            if (checkoutMissing) {
                return {
                    id: existing?.id || null,
                    date: dateStr,
                    actualMinutes: 0,
                    expectedMinutes,
                    shortMinutes: 0,
                    extraMinutes: 0,
                    checkoutMissing: true,
                    status: existing?.status || 'PENDING',
                    isOverridden: existing?.isOverridden || false,
                    adminNote: existing?.adminNote || null,
                    leavesAdjusted: existing?.leavesAdjusted || 0,
                    isWeekend: false,
                };
            }

            const actualMinutes = ar.totalWorkMinutes || 0;
            let shortMinutes = 0;
            let extraMinutes = 0;

            if (existing?.isOverridden) {
                shortMinutes = existing.overriddenShortMinutes || 0;
                extraMinutes = existing.overriddenExtraMinutes || 0;
            } else {
                if (actualMinutes < expectedMinutes) {
                    shortMinutes = expectedMinutes - actualMinutes;
                } else if (actualMinutes > expectedMinutes) {
                    extraMinutes = actualMinutes - expectedMinutes;
                }
            }

            // Only count towards totals if not already approved
            if (existing?.status !== 'APPROVED') {
                totalShortMinutes += shortMinutes;
                totalExtraMinutes += extraMinutes;
            }

            return {
                id: existing?.id || null,
                date: dateStr,
                actualMinutes,
                expectedMinutes,
                shortMinutes,
                extraMinutes,
                checkoutMissing: false,
                status: existing?.status || 'PENDING',
                isOverridden: existing?.isOverridden || false,
                adminNote: existing?.adminNote || null,
                leavesAdjusted: existing?.leavesAdjusted || 0,
                isWeekend: false,
            };
        });

        // Filter out weekends from the result
        const filteredRecords = dailyRecords.filter((r: any) => !r.isWeekend);

        const netMinutes = totalExtraMinutes - totalShortMinutes;

        return {
            employeeId,
            month,
            totalShortMinutes,
            totalExtraMinutes,
            netMinutes,
            dailyRecords: filteredRecords,
        };
    }

    /**
     * Admin summary for all employees in a month
     */
    async getMonthlySummary(companyId: string, month: string) {
        const employees = await this.prisma.employee.findMany({
            where: { companyId, isActive: true },
            select: { id: true, firstName: true, lastName: true, employeeCode: true, leaveBalances: true },
        });

        const summaries = [];
        for (const emp of employees) {
            const sum = await this.getEmployeeMonthlySummary(companyId, emp.id, month);
            summaries.push({
                ...emp,
                ...sum,
            });
        }
        return summaries;
    }

    /**
     * Approve or reject individual daily records.
     * On APPROVED: adjusts leaves immediately for that day's short/extra.
     * On REJECTED: no leave adjustment.
     */
    async approveDailyRecords(
        companyId: string, 
        records: { employeeId: string; date: string; shortMinutes: number; extraMinutes: number }[],
        status: 'APPROVED' | 'REJECTED',
        adminNote?: string,
    ) {
        const results = [];

        for (const record of records) {
            const date = new Date(record.date);
            const employeeId = record.employeeId;

            // Upsert the MissionStrictRecord with the new status
            const updated = await this.prisma.missionStrictRecord.upsert({
                where: { employeeId_date: { employeeId, date } },
                create: {
                    companyId,
                    employeeId,
                    date,
                    shortMinutes: record.shortMinutes,
                    extraMinutes: record.extraMinutes,
                    actualMinutes: 0,
                    status,
                    adminNote,
                    leavesAdjusted: 0,
                },
                update: {
                    status,
                    adminNote,
                    shortMinutes: record.shortMinutes,
                    extraMinutes: record.extraMinutes,
                },
            });

            // If APPROVED, adjust leaves for this specific day
            if (status === 'APPROVED') {
                const netMinutes = record.extraMinutes - record.shortMinutes;
                const adjustment = await this.adjustLeavesForDay(companyId, employeeId, netMinutes);
                
                await this.prisma.missionStrictRecord.update({
                    where: { id: updated.id },
                    data: { leavesAdjusted: adjustment },
                });
            }

            results.push(updated);
        }

        return results;
    }

    /**
     * Adjust leaves for a single day's net minutes.
     * Positive net = extra hours → add to casual leave
     * Negative net = short hours → deduct from casual, then annual
     */
    private async adjustLeavesForDay(companyId: string, employeeId: string, netMinutes: number): Promise<number> {
        if (netMinutes === 0) return 0;

        const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee) throw new NotFoundException('Employee not found');
        
        const balances = (employee.leaveBalances || {}) as Record<string, number>;
        const leaveTypes = await this.prisma.leaveType.findMany({ where: { companyId } });
        const casualType = leaveTypes.find((lt: any) => lt.name.toLowerCase().includes('casual') || lt.code.toLowerCase() === 'cl');
        const annualType = leaveTypes.find((lt: any) => lt.name.toLowerCase().includes('annual') || lt.code.toLowerCase() === 'al');

        // Convert minutes to leave days (540 min = 1 leave day)
        const leaveDays = netMinutes / 540;

        if (netMinutes > 0 && casualType) {
            // Extra hours → add to casual leave
            balances[casualType.id] = (balances[casualType.id] || 0) + leaveDays;
        } else if (netMinutes < 0) {
            // Short hours → deduct from casual first, then annual
            let remaining = Math.abs(leaveDays);

            if (casualType) {
                const current = balances[casualType.id] || 0;
                if (current >= remaining) {
                    balances[casualType.id] = current - remaining;
                    remaining = 0;
                } else {
                    balances[casualType.id] = 0;
                    remaining -= current;
                }
            }

            if (remaining > 0 && annualType) {
                const current = balances[annualType.id] || 0;
                balances[annualType.id] = Math.max(0, current - remaining);
            }
        }

        await this.prisma.employee.update({
            where: { id: employeeId },
            data: { leaveBalances: balances },
        });

        return leaveDays;
    }

    /**
     * Admin override for a daily record
     */
    async overrideDailyRecord(
        companyId: string, 
        employeeId: string, 
        dateStr: string, 
        overriddenShort?: number, 
        overriddenExtra?: number, 
        adminNote?: string,
    ) {
        const date = new Date(dateStr);
        return this.prisma.missionStrictRecord.upsert({
            where: { employeeId_date: { employeeId, date } },
            create: {
                companyId,
                employeeId,
                date,
                isOverridden: true,
                overriddenShortMinutes: overriddenShort || 0,
                overriddenExtraMinutes: overriddenExtra || 0,
                adminNote,
            },
            update: {
                isOverridden: true,
                overriddenShortMinutes: overriddenShort || 0,
                overriddenExtraMinutes: overriddenExtra || 0,
                adminNote,
            },
        });
    }
}
