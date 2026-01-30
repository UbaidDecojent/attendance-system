import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
    constructor(private prisma: PrismaService) { }

    async create(companyId: string, dto: CreateProjectDto) {
        // Verify owner exists
        const owner = await this.prisma.employee.findFirst({
            where: { id: dto.ownerId, companyId },
            include: { user: true }
        });

        if (!owner) throw new NotFoundException('Project Owner not found');

        const project = await this.prisma.project.create({
            data: {
                companyId,
                title: dto.title,
                clientName: dto.clientName,
                description: dto.description,
                ownerId: dto.ownerId,
                status: 'ACTIVE'
            }
        });

        // Send Notification (wrapped in try-catch to avoid blocking project creation)
        if (owner.user) {
            try {
                await this.prisma.notification.create({
                    data: {
                        companyId,
                        userId: owner.user.id,
                        type: 'PROJECT_ASSIGNED',
                        title: 'New Project Assigned',
                        message: `You have been assigned as the owner of project "${project.title}"`,
                        entityId: project.id,
                        entityType: 'project'
                    }
                });
            } catch (error) {
                console.error('Failed to send project assignment notification:', error);
                // Continue - project was still created successfully
            }
        }

        return project;
    }

    async findAll(companyId: string) {
        return this.prisma.project.findMany({
            where: { companyId },
            include: {
                owner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async update(id: string, companyId: string, data: any) {
        const project = await this.prisma.project.findFirst({
            where: { id, companyId }
        });
        if (!project) throw new NotFoundException('Project not found');

        return this.prisma.project.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                clientName: data.clientName,
                ownerId: data.ownerId,
                status: data.status,
            }
        });
    }

    async remove(id: string, companyId: string) {
        const project = await this.prisma.project.findFirst({
            where: { id, companyId }
        });
        if (!project) throw new NotFoundException('Project not found');

        return this.prisma.project.delete({
            where: { id }
        });
    }
}
