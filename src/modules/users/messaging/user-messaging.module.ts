import { Module } from '@nestjs/common';
import { MessagingModule } from '../../../common/messaging/messaging.module';
import { UserKafkaService } from './user-kafka.service';
import { UserEmailService } from './user-email.service';

@Module({
  imports: [MessagingModule],
  providers: [UserKafkaService, UserEmailService],
  exports: [UserKafkaService, UserEmailService],
})
export class UserMessagingModule {}
