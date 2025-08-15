import { Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { BullMQService } from './bullmq.service';
import { EmailingService } from '../emailing.service';

@Module({
  providers: [KafkaService, BullMQService, EmailingService],
  exports: [KafkaService, BullMQService, EmailingService],
})
export class MessagingModule {}
