import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { startOfYear, endOfYear } from 'date-fns';

@Injectable()
export class HolidaysService {
    constructor(private prisma: PrismaService) { }

    async create(companyId: string, data: { name: string; date: string; type?: string; isOptional?: boolean }) {
        const date = new Date(data.date);
        const existing = await this.prisma.holiday.findUnique({
            where: { companyId_date: { companyId, date } },
        });
        if (existing) throw new ConflictException('Holiday already exists for this date');

        return this.prisma.holiday.create({
            data: { companyId, name: data.name, date, type: data.type || 'NATIONAL', isOptional: data.isOptional || false },
        });
    }

    async findAll(companyId: string, year?: number) {
        const targetYear = year || new Date().getFullYear();
        return this.prisma.holiday.findMany({
            where: {
                companyId,
                date: { gte: startOfYear(new Date(targetYear, 0)), lte: endOfYear(new Date(targetYear, 0)) },
            },
            orderBy: { date: 'asc' },
        });
    }

    async update(id: string, companyId: string, data: any) {
        const holiday = await this.prisma.holiday.findFirst({ where: { id, companyId } });
        if (!holiday) throw new NotFoundException('Holiday not found');
        return this.prisma.holiday.update({ where: { id }, data });
    }

    async delete(id: string, companyId: string) {
        const holiday = await this.prisma.holiday.findFirst({ where: { id, companyId } });
        if (!holiday) throw new NotFoundException('Holiday not found');
        return this.prisma.holiday.delete({ where: { id } });
    }
}
