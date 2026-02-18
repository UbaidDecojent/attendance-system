import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DailyUpdatesService } from './daily-updates.service';
import { CreateDailyUpdateDto, UpdateDailyUpdateDto } from './dto/daily-update.dto';

@ApiTags('Daily Updates')
@Controller('daily-updates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DailyUpdatesController {
    constructor(private readonly dailyUpdatesService: DailyUpdatesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a daily update (employee submits work for today)' })
    create(@Body() dto: CreateDailyUpdateDto, @CurrentUser() user: any) {
        return this.dailyUpdatesService.create(user.companyId, user.employeeId, dto);
    }

    @Get('my-today')
    @ApiOperation({ summary: 'Get my daily updates for today' })
    getMyTodayUpdates(@CurrentUser() user: any) {
        return this.dailyUpdatesService.getMyTodayUpdates(user.companyId, user.employeeId);
    }

    @Get('assigned-projects')
    @ApiOperation({ summary: 'Get projects and tasks assigned to me' })
    getAssignedProjectsAndTasks(@CurrentUser() user: any) {
        return this.dailyUpdatesService.getAssignedProjectsAndTasks(user.companyId, user.employeeId);
    }

    @Get('workload')
    @Roles('SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER')
    @ApiOperation({ summary: 'Get workload view for all employees (Admin only)' })
    getWorkloadView(@CurrentUser() user: any) {
        return this.dailyUpdatesService.getWorkloadView(user.companyId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a daily update' })
    update(
        @Param('id') id: string,
        @Body() dto: UpdateDailyUpdateDto,
        @CurrentUser() user: any
    ) {
        return this.dailyUpdatesService.update(id, user.companyId, user.employeeId, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a daily update' })
    remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.dailyUpdatesService.delete(id, user.companyId, user.employeeId);
    }
}
