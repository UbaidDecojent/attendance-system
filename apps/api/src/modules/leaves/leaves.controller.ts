import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeavesService } from './leaves.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { LeaveQueryDto } from './dto/leave-query.dto';
import { LeaveActionDto } from './dto/leave-action.dto';

@ApiTags('Leaves')
@Controller('leaves')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class LeavesController {
    constructor(private readonly leavesService: LeavesService) { }

    @Post()
    @ApiOperation({ summary: 'Request leave' })
    async create(@CurrentUser() user: any, @Body() dto: CreateLeaveDto) {
        return this.leavesService.create(user.employee?.id, user.companyId, dto);
    }

    @Get('types')
    @ApiOperation({ summary: 'Get all leave types' })
    async getLeaveTypes(@CurrentUser() user: any) {
        return this.leavesService.getLeaveTypes(user.companyId, user.employee?.id);
    }

    @Get()
    @ApiOperation({ summary: 'Get all leave requests' })
    async findAll(@CurrentUser() user: any, @Query() query: LeaveQueryDto) {
        return this.leavesService.findAll(user.companyId, query, user);
    }

    @Get('pending')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER, UserRole.TEAM_MANAGER)
    @ApiOperation({ summary: 'Get pending leave requests for approval' })
    async getPending(@CurrentUser() user: any) {
        return this.leavesService.getPending(user.companyId, user.employee?.id);
    }

    @Get('calendar')
    @ApiOperation({ summary: 'Get leave calendar for a month' })
    @ApiQuery({ name: 'month', example: 1 })
    @ApiQuery({ name: 'year', example: 2026 })
    async getCalendar(
        @CurrentUser() user: any,
        @Query('month') month: number,
        @Query('year') year: number,
    ) {
        return this.leavesService.getCalendar(user.companyId, month, year);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get leave request by ID' })
    async findById(@Param('id') id: string, @CurrentUser() user: any) {
        return this.leavesService.findById(id, user.companyId);
    }

    @Put(':id/approve')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER, UserRole.TEAM_MANAGER)
    @ApiOperation({ summary: 'Approve leave request' })
    async approve(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() dto: LeaveActionDto,
    ) {
        return this.leavesService.approve(id, user.companyId, user.id, dto);
    }

    @Put(':id/reject')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER, UserRole.TEAM_MANAGER)
    @ApiOperation({ summary: 'Reject leave request' })
    async reject(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() dto: LeaveActionDto,
    ) {
        return this.leavesService.reject(id, user.companyId, user.id, dto);
    }

    @Put(':id/cancel')
    @ApiOperation({ summary: 'Cancel my leave request' })
    async cancel(@Param('id') id: string, @CurrentUser() user: any) {
        return this.leavesService.cancel(id, user.employee?.id, user.companyId);
    }
}
