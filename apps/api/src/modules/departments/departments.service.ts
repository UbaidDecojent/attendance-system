import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DepartmentsService {
    constructor(private prisma: PrismaService) { }

    async create(companyId: string, data: { name: string; code: string; description?: string; parentId?: string }) {
        const existing = await this.prisma.department.findFirst({
            where: { companyId, code: data.code },
        });
        if (existing) throw new ConflictException('Department code already exists');

        return this.prisma.department.create({
            data: { companyId, ...data },
        });
    }

    async findAll(companyId: string) {
        return this.prisma.department.findMany({
            where: { companyId, isActive: true },
            include: {
                parent: { select: { id: true, name: true } },
                _count: { select: { employees: { where: { isActive: true } } } },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findById(id: string, companyId: string) {
        const dept = await this.prisma.department.findFirst({
            where: { id, companyId },
            include: {
                parent: true,
                children: true,
                employees: { where: { isActive: true }, take: 10 },
            },
        });
        if (!dept) throw new NotFoundException('Department not found');
        return dept;
    }

    async update(id: string, companyId: string, data: any) {
        await this.findById(id, companyId);
        return this.prisma.department.update({ where: { id }, data });
    }

    async delete(id: string, companyId: string) {
        await this.findById(id, companyId);
        return this.prisma.department.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
