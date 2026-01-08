import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ShiftsService {
    constructor(private prisma: PrismaService) { }

    async create(companyId: string, data: any) {
        const existing = await this.prisma.shift.findFirst({
            where: { companyId, code: data.code },
        });
        if (existing) throw new ConflictException('Shift code already exists');

        return this.prisma.shift.create({
            data: { companyId, ...data },
        });
    }

    async findAll(companyId: string) {
        return this.prisma.shift.findMany({
            where: { companyId, isActive: true },
            include: { _count: { select: { employees: { where: { isActive: true } } } } },
            orderBy: { name: 'asc' },
        });
    }

    async findById(id: string, companyId: string) {
        const shift = await this.prisma.shift.findFirst({
            where: { id, companyId },
            include: { employees: { where: { isActive: true }, take: 20 } },
        });
        if (!shift) throw new NotFoundException('Shift not found');
        return shift;
    }

    async update(id: string, companyId: string, data: any) {
        await this.findById(id, companyId);
        return this.prisma.shift.update({ where: { id }, data });
    }

    async delete(id: string, companyId: string) {
        await this.findById(id, companyId);
        return this.prisma.shift.update({ where: { id }, data: { isActive: false } });
    }

    async assignToEmployees(id: string, companyId: string, employeeIds: string[]) {
        await this.findById(id, companyId);
        await this.prisma.employee.updateMany({
            where: { id: { in: employeeIds }, companyId },
            data: { shiftId: id },
        });
        return { message: `Shift assigned to ${employeeIds.length} employees` };
    }
}
