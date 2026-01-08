import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HolidaysService } from './holidays.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Holidays')
@Controller('holidays')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class HolidaysController {
    constructor(private readonly service: HolidaysService) { }

    @Post()
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Create holiday' })
    create(@CurrentUser() user: any, @Body() dto: any) {
        return this.service.create(user.companyId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get holidays' })
    @ApiQuery({ name: 'year', required: false })
    findAll(@CurrentUser() user: any, @Query('year') year?: number) {
        return this.service.findAll(user.companyId, year);
    }

    @Put(':id')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Update holiday' })
    update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: any) {
        return this.service.update(id, user.companyId, dto);
    }

    @Delete(':id')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Delete holiday' })
    delete(@Param('id') id: string, @CurrentUser() user: any) {
        return this.service.delete(id, user.companyId);
    }
}
