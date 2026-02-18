import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

// Common modules
import { PrismaModule } from './common/prisma/prisma.module';
import { LoggerModule } from './common/services/logger.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { DesignationsModule } from './modules/designations/designations.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';

// Middleware
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { TimeLogsModule } from './modules/time-logs/time-logs.module';
import { DailyUpdatesModule } from './modules/daily-updates/daily-updates.module';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),

        // Rate limiting
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ([{
                ttl: config.get<number>('RATE_LIMIT_TTL') || 60,
                limit: config.get<number>('RATE_LIMIT_MAX') || 100,
            }]),
        }),

        // Scheduled tasks
        ScheduleModule.forRoot(),

        // Common modules
        PrismaModule,
        LoggerModule,

        // Feature modules
        AuthModule,
        UsersModule,
        CompaniesModule,
        EmployeesModule,
        DepartmentsModule,
        DesignationsModule,
        ShiftsModule,
        AttendanceModule,
        LeavesModule,
        HolidaysModule,
        ReportsModule,
        SubscriptionModule,
        WebhooksModule,
        AuditModule,
        NotificationsModule,
        ProjectsModule,
        TasksModule,
        TimeLogsModule,
        DailyUpdatesModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestLoggerMiddleware)
            .forRoutes('*');

        consumer
            .apply(TenantMiddleware)
            .exclude(
                'api/v1/auth/(.*)',
                'api/v1/webhooks/(.*)',
                'api/docs(.*)',
            )
            .forRoutes('*');
    }
}
