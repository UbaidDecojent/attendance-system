import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceScheduler } from './attendance.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [NotificationsModule],
    controllers: [AttendanceController],
    providers: [AttendanceService, AttendanceScheduler],
    exports: [AttendanceService],
})
export class AttendanceModule { }
