import { Controller, Get, Post, Body, Query, UseGuards, Put } from '@nestjs/common';
import { MissionStrictService } from './mission-strict.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('mission-strict')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MissionStrictController {
    constructor(private readonly missionStrictService: MissionStrictService) {}

    @Get('summary')
    @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    async getMonthlySummary(
        @Query('month') month: string,
        @CurrentUser() user: any,
    ) {
        return this.missionStrictService.getMonthlySummary(user.companyId, month);
    }

    @Get('summary/me')
    async getMyMonthlySummary(
        @Query('month') month: string,
        @CurrentUser() user: any,
    ) {
        return this.missionStrictService.getEmployeeMonthlySummary(user.companyId, user.employeeId, month);
    }

    /**
     * Approve or reject individual daily records (supports bulk).
     * Body: { records: [{ employeeId, date, shortMinutes, extraMinutes }], status: 'APPROVED' | 'REJECTED', adminNote? }
     */
    @Post('approve-daily')
    @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    async approveDailyRecords(
        @Body() data: {
            records: { employeeId: string; date: string; shortMinutes: number; extraMinutes: number }[];
            status: 'APPROVED' | 'REJECTED';
            adminNote?: string;
        },
        @CurrentUser() user: any,
    ) {
        return this.missionStrictService.approveDailyRecords(
            user.companyId,
            data.records,
            data.status,
            data.adminNote,
        );
    }

    @Put('override')
    @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    async overrideDailyRecord(
        @Body() data: { employeeId: string; date: string; shortMinutes?: number; extraMinutes?: number; adminNote?: string },
        @CurrentUser() user: any,
    ) {
        return this.missionStrictService.overrideDailyRecord(
            user.companyId,
            data.employeeId,
            data.date,
            data.shortMinutes,
            data.extraMinutes,
            data.adminNote,
        );
    }
}
