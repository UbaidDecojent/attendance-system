import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Shifts')
@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ShiftsController {
    constructor(private readonly service: ShiftsService) { }

    @Post()
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Create shift' })
    create(@CurrentUser() user: any, @Body() dto: any) {
        return this.service.create(user.companyId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all shifts' })
    findAll(@CurrentUser() user: any) {
        return this.service.findAll(user.companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get shift by ID' })
    findById(@Param('id') id: string, @CurrentUser() user: any) {
        return this.service.findById(id, user.companyId);
    }

    @Put(':id')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Update shift' })
    update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: any) {
        return this.service.update(id, user.companyId, dto);
    }

    @Delete(':id')
    @Roles(UserRole.COMPANY_ADMIN)
    @ApiOperation({ summary: 'Delete shift' })
    delete(@Param('id') id: string, @CurrentUser() user: any) {
        return this.service.delete(id, user.companyId);
    }

    @Post(':id/assign')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Assign shift to employees' })
    assign(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: { employeeIds: string[] }) {
        return this.service.assignToEmployees(id, user.companyId, dto.employeeIds);
    }
}
