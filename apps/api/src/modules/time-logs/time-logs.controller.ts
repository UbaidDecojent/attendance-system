import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TimeLogsService } from './time-logs.service';
import { CreateTimeLogDto } from './dto/create-time-log.dto';
import { TimeLogStatus, BillingType } from '@prisma/client';

@ApiTags('Time Logs')
@Controller('time-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TimeLogsController {
    constructor(private readonly timeLogsService: TimeLogsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new time log' })
    create(@Body() createDto: CreateTimeLogDto, @CurrentUser() user: any) {
        return this.timeLogsService.create(user.companyId, user, createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all time logs' })
    findAll(
        @CurrentUser() user: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('projectIds') projectIds?: string | string[],
        @Query('userIds') userIds?: string | string[],
        @Query('status') status?: TimeLogStatus,
        @Query('billingType') billingType?: BillingType,
        @Query('clientNames') clientNames?: string | string[],
    ) {
        // Normalize to array if single string
        const pIds = projectIds ? (Array.isArray(projectIds) ? projectIds : [projectIds]) : undefined;
        const uIds = userIds ? (Array.isArray(userIds) ? userIds : [userIds]) : undefined;
        const cNames = clientNames ? (Array.isArray(clientNames) ? clientNames : [clientNames]) : undefined;

        return this.timeLogsService.findAll(user.companyId, user, {
            startDate,
            endDate,
            projectIds: pIds,
            userIds: uIds,
            status,
            billingType,
            clientNames: cNames
        });
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a time log' })
    update(
        @Param('id') id: string,
        @Body() updateData: Partial<CreateTimeLogDto>,
        @CurrentUser() user: any,
    ) {
        return this.timeLogsService.update(id, user.companyId, user, updateData);
    }

    @Patch(':id/status')
    @Roles('SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER')
    @ApiOperation({ summary: 'Update time log status (Admin only)' })
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: TimeLogStatus,
        @CurrentUser() user: any,
    ) {
        return this.timeLogsService.updateStatus(id, user.companyId, status);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a time log' })
    remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.timeLogsService.delete(id, user.companyId);
    }
}
