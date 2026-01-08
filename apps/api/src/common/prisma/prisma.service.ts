import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'stdout', level: 'info' },
                { emit: 'stdout', level: 'warn' },
                { emit: 'stdout', level: 'error' },
            ],
            errorFormat: 'colorless',
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    async cleanDatabase() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('cleanDatabase is not allowed in production');
        }

        const models = Prisma.dmmf.datamodel.models;
        const tablesToTruncate = models.map((model) => model.dbName || model.name);

        for (const tableName of tablesToTruncate) {
            await this.$executeRawUnsafe(
                `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`,
            );
        }
    }

    // Soft delete middleware could be added here
    useSoftDelete() {
        this.$use(async (params, next) => {
            // Implement soft delete logic if needed
            return next(params);
        });
    }
}
