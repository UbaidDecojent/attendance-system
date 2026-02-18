import { Controller, Get, Post, Body, UseGuards, Patch, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @Post()
    @Roles('COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER')
    @ApiOperation({ summary: 'Create a new project' })
    create(@Body() createProjectDto: CreateProjectDto, @CurrentUser() user: any) {
        return this.projectsService.create(user.companyId, createProjectDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all projects' })
    findAll(@CurrentUser() user: any) {
        return this.projectsService.findAll(user.companyId);
    }

    @Patch(':id')
    @Roles('COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER')
    @ApiOperation({ summary: 'Update a project' })
    update(
        @Param('id') id: string,
        @Body() updateDto: any, // Using any for simplicity as DTO is missing
        @CurrentUser() user: any
    ) {
        return this.projectsService.update(id, user.companyId, updateDto);
    }

    @Delete(':id')
    @Roles('COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER')
    @ApiOperation({ summary: 'Delete a project' })
    remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.projectsService.remove(id, user.companyId);
    }
}
