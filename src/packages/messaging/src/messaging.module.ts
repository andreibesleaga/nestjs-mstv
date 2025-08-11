import { Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { BullMQService } from './bullmq.service';

@Module({
  providers: [KafkaService, BullMQService],
  exports: [KafkaService, BullMQService],
})
export class MessagingModule {}
