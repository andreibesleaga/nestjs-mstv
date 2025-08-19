import { Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { BullMQService } from './bullmq.service';
import { EmailingService } from '../services/emailing.service';
import { CommonModule } from '../common.module';

@Module({
  imports: [CommonModule],
  providers: [KafkaService, BullMQService, EmailingService],
  exports: [KafkaService, BullMQService, EmailingService],
})
export class MessagingModule {}
