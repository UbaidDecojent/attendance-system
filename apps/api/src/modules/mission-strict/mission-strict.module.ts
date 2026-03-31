import { Module } from '@nestjs/common';
import { MissionStrictController } from './mission-strict.controller';
import { MissionStrictService } from './mission-strict.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [MissionStrictController],
    providers: [MissionStrictService],
    exports: [MissionStrictService],
})
export class MissionStrictModule {}
