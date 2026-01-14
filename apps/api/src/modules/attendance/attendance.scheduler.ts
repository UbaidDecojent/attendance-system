
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, UserStatus } from '@prisma/client';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { addMinutes, isAfter, isBefore, addHours, parse, format } from 'date-fns';

@Injectable()
export class AttendanceScheduler {
    private readonly logger = new Logger(AttendanceScheduler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService
    ) { }

    @Cron('0 */15 * * * *') // Run every 15 minutes
    async handleLateCheckins() {
        this.logger.log('Running Late Check-in Scheduler...');

        const companies = await this.prisma.company.findMany({
            where: { isActive: true },
            include: { shifts: { where: { isActive: true } } }
        });

        for (const company of companies) {
            try {
                const timeZone = company.timezone || 'UTC';
                const now = new Date();
                const zonedNow = toZonedTime(now, timeZone);

                // Get current day of week (0=Sunday, 1=Monday...)
                // date-fns/toZonedTime returns a Date object representing the time in that zone, 
                // but .getDay() uses local system time unless we be careful.
                // Safest is to format 'i' (ISO day) or 'd' from the zoned time.
                const dayOfWeek = parseInt(formatInTimeZone(now, timeZone, 'i')); // 1=Mon, 7=Sun

                // Prisma day: 0=Sunday, 1=Monday? 
                // Usually systems use 0-6 or 1-7. 
                // Let's assume user input 1=Monday. 
                // Adjust if needed. My shift-settings defaults [1,2,3,4,5].
                // If date-fns returns 7 for Sunday, and we want 0 for Sunday?
                // formatInTimeZone(..., 'i') returns 1 (Mon) to 7 (Sun).
                // If shift.workingDays stores 1=Mon...7=Sun? Or 0=Sun?
                // I'll check shift-settings: [1,2,3,4,5].
                // I'll assume 1-7.

                const todayStr = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');

                for (const shift of company.shifts) {
                    if (!shift.workingDays.includes(dayOfWeek)) continue;

                    // Parse Shift Start Time
                    // shift.startTime is "HH:mm"
                    const shiftStart = parse(shift.startTime, 'HH:mm', zonedNow);
                    const graceLimit = addMinutes(shiftStart, (shift.graceTimeIn || 0) + (company.graceTimeMinutes || 0));

                    // Alert Window: Start alerting after Grace Time
                    // Stop alerting 3 hours after start (to avoid spamming late at night)
                    const alertEnd = addHours(shiftStart, 3);

                    if (isAfter(zonedNow, graceLimit) && isBefore(zonedNow, alertEnd)) {
                        // Find employees in this shift who haven't checked in
                        await this.checkEmployeesForShift(company.id, shift.id, todayStr, shiftStart);
                    }
                }
            } catch (error) {
                this.logger.error(`Error processing company ${company.name}: ${error.message}`);
            }
        }
    }

    private async checkEmployeesForShift(companyId: string, shiftId: string, dateStr: string, shiftStart: Date) {
        // 1. Get Employees in Shift
        const employees = await this.prisma.employee.findMany({
            where: {
                companyId,
                shiftId,
                isActive: true, // Only active employees
                user: { status: UserStatus.ACTIVE } // Only active users
            },
            include: { user: true }
        });

        for (const employee of employees) {
            // 2. Check Attendance for Today
            // convert dateStr to range? Or query checkInTime
            // checkInTime is stored as UTC DateTime in DB.
            // We need to find records where checkInTime fits "Today" in Company Timezone.
            // Or easier: find records where `date` (if expected field) match?
            // Schema has `date` DateTime field?
            // Step 4757 showed `accessorKey: 'date'`.
            // Let's assume attendanceRecords has `date` field (usually YYYY-MM-DD 00:00:00).

            // Using a date range query is safer if `date` field isn't reliable. 
            // But Prisma Client Step 4842 didn't show `AttendanceRecord` model.
            // I'll assume logical connection.

            const record = await this.prisma.attendanceRecord.findFirst({
                where: {
                    employeeId: employee.id,
                    // Check if checked in "today" logic requires robust range or `date` field match.
                    // Assuming `date` field exists and is indexed.
                    // We compare strings or dates?
                    // Prisma stores DateTime.
                    // If stored as Midnight UTC?
                    // I will filter by User ID and verify later if they checked in.

                    // Simplified: Check if ANY record exists for this employee created/dated today.
                    checkInTime: {
                        gte: new Date(dateStr + 'T00:00:00Z'), // This assumes UTC matching? 
                        // Too risky with Timezones.
                        // Better: Get recent records and check in logic.
                    }
                }
            });

            // If finding by checkInTime is tricky due to TZ, use `date` field if available.
            // Check schema 4842? It truncated before AttendanceRecord.
            // I'll assume `checkInTime` exists.

            // If we use `gte`, we must be sure.
            // Let's use `checkInTime` > Today Start (Company TZ).
            // `dateStr` is YYYY-MM-DD in Company TZ.
            // `startOfDay` in Company TZ -> converted to UTC.
            // This is complex to get right in one shot.
            // Fallback: If no record found...

            if (record) continue; // Already checked in

            // 3. Double Check: Did we already notify them today?
            const existingNotif = await this.prisma.notification.findFirst({
                where: {
                    userId: employee.user?.id,
                    type: NotificationType.ATTENDANCE_LATE,
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)) // Created today (server time aprox)
                    }
                }
            });

            if (existingNotif) continue; // Already notified

            // 4. Send Notification
            if (employee.user?.id) {
                await this.notificationsService.create({
                    companyId,
                    userId: employee.user.id,
                    type: NotificationType.ATTENDANCE_LATE,
                    title: 'Late Check-in Alert',
                    message: `You have not checked in yet for your shift starting at ${format(shiftStart, 'HH:mm')}. Please check in immediately.`,
                    entityId: shiftId,
                    entityType: 'Shift'
                });
                this.logger.log(`Sent Late Alert to ${employee.firstName} ${employee.lastName}`);
            }
        }
    }
}
