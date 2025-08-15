import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthResolver } from './resolvers/auth.resolver';
import { RedisClient } from './redis.client';
import { PoliciesGuard } from './policies.guard';
import { PrismaService } from '../../common/prisma.service';
import { UserMessagingModule } from '../../modules/users/messaging/user-messaging.module';

@Module({
  imports: [UserMessagingModule],
  providers: [PrismaService, AuthService, RedisClient, AuthResolver, PoliciesGuard],
  controllers: [AuthController],
  exports: [AuthService, PoliciesGuard],
})
export class AuthModule {}
