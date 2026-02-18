// Force Rebuild 16
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

import { ZohoService } from './zoho.service';

@Module({
    imports: [PrismaModule],
    controllers: [TasksController],
    providers: [TasksService, ZohoService],
    exports: [TasksService],
})
export class TasksModule { }
