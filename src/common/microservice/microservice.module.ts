import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MicroserviceService } from './microservice.service';
import { MicroserviceConfigService } from './microservice-config.service';
import { ExampleMicroserviceUsageService } from './example-usage.service';
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
  ],
  exports: [
    MicroserviceService,
    MicroserviceConfigService,
    ExampleMicroserviceUsageService,
  ],
})
export class MicroserviceModule {}
