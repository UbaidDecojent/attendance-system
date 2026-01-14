import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { ManualAttendanceDto } from './dto/manual-attendance.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { BulkLockDto } from './dto/bulk-lock.dto';
import { CreateRegularizationDto } from './dto/create-regularization.dto';
import { UpdateRegularizationDto } from './dto/update-regularization.dto';

@ApiTags('Attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    // ==================== EMPLOYEE SELF-SERVICE ====================

    @Post('check-in')
    @ApiOperation({ summary: 'Check in for the day' })
    async checkIn(
        @CurrentUser() user: any,
        @Body() dto: CheckInDto,
        @Req() req: Request,
    ) {
        // Add IP and device info
        dto.ipAddress = req.ip || req.connection.remoteAddress || '';
        dto.deviceInfo = req.get('user-agent') || '';

        return this.attendanceService.checkIn(
            user.employee?.id,
            user.companyId,
            dto,
        );
    }

    @Post('check-out')
    @ApiOperation({ summary: 'Check out for the day' })
    async checkOut(
        @CurrentUser() user: any,
        @Body() dto: CheckOutDto,
        @Req() req: Request,
    ) {
        dto.ipAddress = req.ip || req.connection.remoteAddress || '';
        dto.deviceInfo = req.get('user-agent') || '';

        return this.attendanceService.checkOut(
            user.employee?.id,
            user.companyId,
            dto,
        );
    }

    @Post('break/start')
    @ApiOperation({ summary: 'Start a break' })
    async startBreak(@CurrentUser() user: any) {
        return this.attendanceService.startBreak(
            user.employee?.id,
            user.companyId,
        );
    }

    @Post('break/end')
    @ApiOperation({ summary: 'End a break' })
    async endBreak(@CurrentUser() user: any) {
        return this.attendanceService.endBreak(
            user.employee?.id,
            user.companyId,
        );
    }

    @Get('today')
    @ApiOperation({ summary: "Get today's attendance status" })
    async getTodayStatus(@CurrentUser() user: any) {
        return this.attendanceService.getTodayStatus(
            user.employee?.id,
            user.companyId,
        );
    }

    @Get('my-history')
    @ApiOperation({ summary: 'Get my attendance history' })
    async getMyHistory(
        @CurrentUser() user: any,
        @Query() query: AttendanceQueryDto,
    ) {
        query.employeeId = user.employee?.id;
        return this.attendanceService.getHistory(user.companyId, query, user);
    }

    // ==================== REGULARIZATION ====================

    @Post('regularization')
    @ApiOperation({ summary: 'Create regularization request' })
    async createRegularization(
        @CurrentUser() user: any,
        @Body() dto: CreateRegularizationDto,
    ) {
        return this.attendanceService.createRegularization(
            user.companyId,
            user.employee?.id,
            dto
        );
    }

    @Get('regularization')
    @ApiOperation({ summary: 'Get regularization requests' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'employeeId', required: false })
    async getRegularizationRequests(
        @CurrentUser() user: any,
        @Query('status') status?: string,
        @Query('employeeId') employeeId?: string,
    ) {
        // If employee, force employeeId
        const targetEmployeeId = user.role === UserRole.EMPLOYEE ? user.employee?.id : employeeId;
        return this.attendanceService.getRegularizationRequests(
            user.companyId,
            targetEmployeeId,
            status
        );
    }

    @Put('regularization/:id')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER, UserRole.TEAM_MANAGER)
    @ApiOperation({ summary: 'Approve or Reject regularization request' })
    async updateRegularization(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() dto: UpdateRegularizationDto,
    ) {
        return this.attendanceService.updateRegularization(
            user.companyId,
            id,
            dto,
            user.id
        );
    }

    // ==================== HR/ADMIN OPERATIONS ====================

    @Get('history')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER, UserRole.TEAM_MANAGER)
    @ApiOperation({ summary: 'Get attendance history for all employees' })
    async getHistory(
        @CurrentUser() user: any,
        @Query() query: AttendanceQueryDto,
    ) {
        return this.attendanceService.getHistory(user.companyId, query, user);
    }

    @Post('manual')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Create manual attendance entry' })
    async createManualEntry(
        @CurrentUser() user: any,
        @Body() dto: ManualAttendanceDto,
    ) {
        return this.attendanceService.createManualEntry(
            user.companyId,
            dto,
            user.id,
        );
    }

    @Put(':id/approve')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER, UserRole.TEAM_MANAGER)
    @ApiOperation({ summary: 'Approve attendance record' })
    async approveAttendance(
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        return this.attendanceService.approveAttendance(
            id,
            user.id,
            user.companyId,
        );
    }

    @Put(':id/lock')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Lock attendance record' })
    async lockAttendance(
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        return this.attendanceService.lockAttendance(id, user.companyId);
    }

    @Post('bulk-lock')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Bulk lock attendance records for a date range' })
    async bulkLock(
        @CurrentUser() user: any,
        @Body() dto: BulkLockDto,
    ) {
        return this.attendanceService.bulkLockAttendance(
            user.companyId,
            dto.startDate,
            dto.endDate,
        );
    }

    // ==================== DASHBOARD & STATS ====================

    @Get('dashboard')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER, UserRole.TEAM_MANAGER)
    @ApiOperation({ summary: 'Get attendance dashboard statistics' })
    @ApiQuery({ name: 'date', required: false })
    async getDashboard(
        @CurrentUser() user: any,
        @Query('date') date?: string,
    ) {
        return this.attendanceService.getDashboardStats(user.companyId, date);
    }
}
