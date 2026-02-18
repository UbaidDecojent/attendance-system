import { Controller, Get, Put, Body, UseGuards, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('profile')
    @ApiOperation({ summary: 'Get current user profile' })
    async getProfile(@CurrentUser() user: any) {
        return this.usersService.findById(user.id);
    }

    @Put('profile')
    @ApiOperation({ summary: 'Update current user profile' })
    async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
        return this.usersService.update(user.id, dto);
    }

    @Put('password')
    @ApiOperation({ summary: 'Change password' })
    async changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
        return this.usersService.changePassword(user.id, dto);
    }

    @Get()
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Get all users in company' })
    async getCompanyUsers(@CurrentUser() user: any) {
        return this.usersService.getByCompany(user.companyId);
    }

    @Get(':id')
    @Roles(UserRole.COMPANY_ADMIN, UserRole.HR_MANAGER)
    @ApiOperation({ summary: 'Get user by ID' })
    async getUserById(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Patch(':id/role')
    @Roles(UserRole.COMPANY_ADMIN)
    @ApiOperation({ summary: 'Update user role (Admin only)' })
    async updateRole(
        @Param('id') id: string,
        @Body('role') role: string,
        @CurrentUser() user: any,
    ) {
        return this.usersService.updateRole(id, role, user.id);
    }
}
