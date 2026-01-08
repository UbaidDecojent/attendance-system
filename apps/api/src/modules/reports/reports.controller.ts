import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
    constructor(private readonly service: ReportsService) { }

    @Get('attendance')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER, UserRole.TEAM_MANAGER)
    @ApiOperation({ summary: 'Get attendance report' })
    @ApiQuery({ name: 'startDate', example: '2026-01-01' })
    @ApiQuery({ name: 'endDate', example: '2026-01-31' })
    @ApiQuery({ name: 'departmentId', required: false })
    getAttendanceReport(
        @CurrentUser() user: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('departmentId') departmentId?: string,
    ) {
        return this.service.getAttendanceReport(user.companyId, startDate, endDate, departmentId);
    }

    @Get('leave')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Get leave report' })
    @ApiQuery({ name: 'startDate', example: '2026-01-01' })
    @ApiQuery({ name: 'endDate', example: '2026-01-31' })
    getLeaveReport(
        @CurrentUser() user: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.service.getLeaveReport(user.companyId, startDate, endDate);
    }

    @Get('department')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Get department-wise report' })
    @ApiQuery({ name: 'month', example: 1 })
    @ApiQuery({ name: 'year', example: 2026 })
    getDepartmentReport(
        @CurrentUser() user: any,
        @Query('month') month: number,
        @Query('year') year: number,
    ) {
        return this.service.getDepartmentReport(user.companyId, month, year);
    }

    @Get('payroll')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Get payroll summary report' })
    @ApiQuery({ name: 'month', example: 1 })
    @ApiQuery({ name: 'year', example: 2026 })
    getPayrollSummary(
        @CurrentUser() user: any,
        @Query('month') month: number,
        @Query('year') year: number,
    ) {
        return this.service.getPayrollSummary(user.companyId, month, year);
    }

    @Get('analytics')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER, UserRole.TEAM_MANAGER, UserRole.EMPLOYEE)
    @ApiOperation({ summary: 'Get analytics dashboard data' })
    getAnalytics(@CurrentUser() user: any) {
        const employeeId = user.role === UserRole.EMPLOYEE ? user.employee?.id : undefined;
        return this.service.getAnalytics(user.companyId, employeeId);
    }
}
