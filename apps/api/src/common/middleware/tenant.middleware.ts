import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

export interface TenantRequest extends Request {
    tenantId?: string;
    companyId?: string;
    user?: {
        id: string;
        email: string;
        role: string;
        companyId?: string;
    };
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    constructor(private readonly prisma: PrismaService) { }

    async use(req: TenantRequest, res: Response, next: NextFunction) {
        // Skip for unauthenticated routes
        if (!req.user) {
            return next();
        }

        const companyId = req.user.companyId;

        if (!companyId) {
            // Super admins don't need tenant context
            if (req.user.role === 'SUPER_ADMIN') {
                return next();
            }
            throw new ForbiddenException('No tenant context found');
        }

        // Validate company exists and is active
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                isActive: true,
                timezone: true,
            },
        });

        if (!company) {
            throw new ForbiddenException('Tenant not found');
        }

        if (!company.isActive) {
            throw new ForbiddenException('Your company account has been suspended');
        }

        // Attach tenant info to request
        req.tenantId = companyId;
        req.companyId = companyId;

        next();
    }
}
