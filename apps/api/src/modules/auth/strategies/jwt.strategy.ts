import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    companyId?: string;
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    async validate(payload: JwtPayload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
                companyId: true,
                employeeId: true,
                avatar: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                        timezone: true,
                    },
                },
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        departmentId: true,
                        designationId: true,
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (user.status !== 'ACTIVE') {
            throw new UnauthorizedException('Account is not active');
        }

        if (user.company && !user.company.isActive) {
            throw new UnauthorizedException('Company account is suspended');
        }

        return user;
    }
}
