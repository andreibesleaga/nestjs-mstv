import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MicroserviceService } from './microservice.service';
import { MicroserviceConfigService } from './microservice-config.service';
import { ExampleMicroserviceUsageService } from './example-usage.service';
import { TransportManager } from './transport.manager';
import { StreamingManager } from './streaming.manager';
import { SchedulerManager } from './scheduler.manager';
import { CacheManager } from './cache.manager';
import { MessagingModule } from '../messaging/messaging.module';
import { ProtocolsModule } from '../../protocols/protocols.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    MessagingModule,
    ProtocolsModule,
  ],
  providers: [
    MicroserviceService,
    MicroserviceConfigService,
    ExampleMicroserviceUsageService,
    TransportManager,
    StreamingManager,
    SchedulerManager,
    CacheManager,
  ],
  exports: [
    MicroserviceService,
    MicroserviceConfigService,
    ExampleMicroserviceUsageService,
    TransportManager,
    StreamingManager,
    SchedulerManager,
    CacheManager,
  ],
})
export class MicroserviceModule {}
