import { Module } from '@nestjs/common';
import { TimeLogsController } from './time-logs.controller';
import { TimeLogsService } from './time-logs.service';

@Module({
  controllers: [TimeLogsController],
  providers: [TimeLogsService]
})
export class TimeLogsModule {}
