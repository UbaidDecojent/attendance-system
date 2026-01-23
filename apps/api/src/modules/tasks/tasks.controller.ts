import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    @Roles('SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: 'Create a new task' })
    create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() user: any) {
        return this.tasksService.create(user.companyId, createTaskDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all tasks' })
    findAll(
        @CurrentUser() user: any,
        @Query('projectId') projectId?: string,
        @Query('status') status?: string,
        @Query('priority') priority?: string,
        @Query('billingType') billingType?: string,
        @Query('assigneeId') assigneeId?: string,
        @Query('startDate') startDate?: string,
        @Query('dueDate') dueDate?: string,
    ) {
        return this.tasksService.findAll(user.companyId, user, {
            projectId,
            status,
            priority,
            billingType,
            assigneeId,
            startDate,
            dueDate
        });
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a task' })
    update(
        @Param('id') id: string,
        @Body() updateData: any,
        @CurrentUser() user: any,
    ) {
        return this.tasksService.update(id, user.companyId, updateData);
    }
}
