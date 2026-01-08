import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';

@ApiTags('Employees')
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class EmployeesController {
    constructor(private readonly employeesService: EmployeesService) { }

    @Post()
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Create a new employee' })
    async create(@CurrentUser() user: any, @Body() dto: CreateEmployeeDto) {
        return this.employeesService.create(user.companyId, dto);
    }

    @Get()
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER, UserRole.TEAM_MANAGER)
    @ApiOperation({ summary: 'Get all employees' })
    async findAll(@CurrentUser() user: any, @Query() query: EmployeeQueryDto) {
        return this.employeesService.findAll(user.companyId, query);
    }

    @Get('stats')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Get employee statistics' })
    async getStats(@CurrentUser() user: any) {
        return this.employeesService.getStats(user.companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get employee by ID' })
    async findById(@Param('id') id: string, @CurrentUser() user: any) {
        return this.employeesService.findById(id, user.companyId);
    }

    @Put(':id')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Update employee' })
    async update(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() dto: UpdateEmployeeDto,
    ) {
        return this.employeesService.update(id, user.companyId, dto);
    }

    @Delete(':id')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Deactivate employee' })
    async deactivate(@Param('id') id: string, @CurrentUser() user: any) {
        return this.employeesService.deactivate(id, user.companyId);
    }

    @Put(':id/reactivate')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Reactivate employee' })
    async reactivate(@Param('id') id: string, @CurrentUser() user: any) {
        return this.employeesService.reactivate(id, user.companyId);
    }

    @Get(':id/leave-balances')
    @ApiOperation({ summary: 'Get employee leave balances' })
    async getLeaveBalances(@Param('id') id: string, @CurrentUser() user: any) {
        return this.employeesService.getLeaveBalances(id, user.companyId);
    }

    @Put(':id/leave-balances')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Adjust employee leave balance' })
    async updateLeaveBalance(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() dto: UpdateLeaveBalanceDto,
    ) {
        return this.employeesService.updateLeaveBalance(
            id,
            user.companyId,
            dto.leaveTypeId,
            dto.adjustment,
            dto.reason,
        );
    }

    @Get(':id/attendance')
    @ApiOperation({ summary: 'Get employee attendance history' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    async getAttendanceHistory(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.employeesService.getAttendanceHistory(
            id,
            user.companyId,
            startDate,
            endDate,
        );
    }
}
