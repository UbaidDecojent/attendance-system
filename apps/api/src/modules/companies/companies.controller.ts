import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Companies')
@Controller('company')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class CompaniesController {
    constructor(private readonly companiesService: CompaniesService) { }

    @Get()
    @ApiOperation({ summary: 'Get company details' })
    async getCompany(@CurrentUser() user: any) {
        return this.companiesService.getCompany(user.companyId);
    }

    @Put()
    @Roles(UserRole.COMPANY_ADMIN)
    @ApiOperation({ summary: 'Update company details' })
    async update(@CurrentUser() user: any, @Body() dto: UpdateCompanyDto) {
        return this.companiesService.update(user.companyId, dto);
    }

    @Get('settings')
    @ApiOperation({ summary: 'Get company settings' })
    async getSettings(@CurrentUser() user: any) {
        return this.companiesService.getSettings(user.companyId);
    }

    @Put('settings')
    @Roles(UserRole.COMPANY_ADMIN)
    @ApiOperation({ summary: 'Update company settings' })
    async updateSettings(@CurrentUser() user: any, @Body() dto: UpdateSettingsDto) {
        return this.companiesService.updateSettings(user.companyId, dto);
    }

    @Get('dashboard')
    @ApiOperation({ summary: 'Get dashboard statistics' })
    async getDashboard(@CurrentUser() user: any) {
        return this.companiesService.getDashboardStats(user.companyId);
    }
}
