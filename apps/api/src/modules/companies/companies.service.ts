import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateOfficeLocationDto, UpdateOfficeLocationDto } from './dto/office-location.dto';

@Injectable()
export class CompaniesService {
    constructor(private prisma: PrismaService) { }

    async getCompany(id: string) {
        const company = await this.prisma.company.findUnique({
            where: { id },
            include: {
                subscriptions: {
                    where: { status: { in: ['ACTIVE', 'TRIALING'] } },
                    include: { plan: true },
                    take: 1,
                },
                _count: {
                    select: {
                        employees: { where: { isActive: true } },
                        departments: true,
                        users: true,
                    },
                },
            },
        });

        if (!company) {
            throw new NotFoundException('Company not found');
        }

        return company;
    }

    async update(id: string, dto: UpdateCompanyDto) {
        return this.prisma.company.update({
            where: { id },
            data: dto,
        });
    }

    async getSettings(id: string) {
        const company = await this.prisma.company.findUnique({
            where: { id },
            select: {
                timezone: true,
                dateFormat: true,
                timeFormat: true,
                weekStartDay: true,
                fiscalYearStart: true,
                allowRemoteAttendance: true,
                requireGpsTracking: true,
                allowIpRestriction: true,
                allowedIps: true,
                autoCheckoutEnabled: true,
                autoCheckoutTime: true,
                overtimeThresholdMinutes: true,
                graceTimeMinutes: true,
            },
        });

        if (!company) {
            throw new NotFoundException('Company not found');
        }

        return company;
    }

    async updateSettings(id: string, dto: UpdateSettingsDto) {
        return this.prisma.company.update({
            where: { id },
            data: dto,
        });
    }

    async getDashboardStats(id: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalEmployees,
            activeEmployees,
            presentToday,
            pendingLeaves,
            subscription,
        ] = await Promise.all([
            this.prisma.employee.count({ where: { companyId: id } }),
            this.prisma.employee.count({ where: { companyId: id, isActive: true } }),
            this.prisma.attendanceRecord.count({
                where: {
                    companyId: id,
                    date: today,
                    status: { in: ['PRESENT', 'HALF_DAY'] },
                },
            }),
            this.prisma.leave.count({
                where: { companyId: id, status: 'PENDING' },
            }),
            this.prisma.subscription.findFirst({
                where: { companyId: id, status: { in: ['ACTIVE', 'TRIALING'] } },
                include: { plan: true },
            }),
        ]);

        return {
            employees: {
                total: totalEmployees,
                active: activeEmployees,
                inactive: totalEmployees - activeEmployees,
            },
            attendance: {
                presentToday,
                absentToday: activeEmployees - presentToday,
                attendanceRate: activeEmployees > 0
                    ? ((presentToday / activeEmployees) * 100).toFixed(1)
                    : 0,
            },
            leaves: {
                pendingApproval: pendingLeaves,
            },
            subscription: subscription ? {
                plan: subscription.plan.name,
                status: subscription.status,
                currentPeriodEnd: subscription.currentPeriodEnd,
            } : null,
        };
    }

    // ==================== OFFICE LOCATIONS ====================

    async addOfficeLocation(companyId: string, dto: CreateOfficeLocationDto) {
        return this.prisma.officeLocation.create({
            data: {
                ...dto,
                companyId,
            }
        });
    }

    async getOfficeLocations(companyId: string) {
        return this.prisma.officeLocation.findMany({
            where: { companyId, isActive: true },
        });
    }

    async updateOfficeLocation(locationId: string, companyId: string, dto: UpdateOfficeLocationDto) {
        const location = await this.prisma.officeLocation.findFirst({
            where: { id: locationId, companyId },
        });

        if (!location) {
            throw new NotFoundException('Office location not found');
        }

        return this.prisma.officeLocation.update({
            where: { id: locationId },
            data: dto,
        });
    }
}
