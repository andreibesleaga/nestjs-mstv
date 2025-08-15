import { Injectable } from '@nestjs/common';
import { KafkaService } from '../../../common/messaging/kafka.service';

@Injectable()
export class UserKafkaService {
  constructor(private readonly kafkaService: KafkaService) {}

  // User Events
  async publishUserRegistered(userId: string, email: string, name?: string, role = 'user') {
    await this.kafkaService.publishMessage('user.events', {
      event: 'user.registered',
      userId,
      email,
      name,
      role,
      timestamp: new Date().toISOString(),
    });
  }

  async publishUserUpdated(userId: string, changes: Record<string, any>) {
    await this.kafkaService.publishMessage('user.events', {
      event: 'user.updated',
      userId,
      changes,
      timestamp: new Date().toISOString(),
    });
  }

  async publishUserDeleted(userId: string, email: string, deletedBy?: string) {
    await this.kafkaService.publishMessage('user.events', {
      event: 'user.deleted',
      userId,
      email,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  // Auth Events
  async publishUserLoggedIn(
    userId: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.kafkaService.publishMessage('auth.events', {
      event: 'user.logged_in',
      userId,
      sessionId,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  }

  async publishUserLoggedOut(userId: string, sessionId?: string) {
    await this.kafkaService.publishMessage('auth.events', {
      event: 'user.logged_out',
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  async publishTokenRefreshed(userId: string, tokenId?: string) {
    await this.kafkaService.publishMessage('auth.events', {
      event: 'token.refreshed',
      userId,
      tokenId,
      timestamp: new Date().toISOString(),
    });
  }

  // Email Events
  async publishEmailWelcome(userId: string, email: string, name?: string) {
    await this.kafkaService.publishMessage('email.events', {
      event: 'email.welcome',
      userId,
      email,
      name,
      timestamp: new Date().toISOString(),
    });
  }

  async publishEmailPasswordReset(
    userId: string,
    email: string,
    resetToken: string,
    expiresAt: string
  ) {
    await this.kafkaService.publishMessage('email.events', {
      event: 'email.password_reset',
      userId,
      email,
      resetToken,
      expiresAt,
      timestamp: new Date().toISOString(),
    });
  }

  async publishEmailVerification(userId: string, email: string, verificationToken: string) {
    await this.kafkaService.publishMessage('email.events', {
      event: 'email.verification',
      userId,
      email,
      verificationToken,
      timestamp: new Date().toISOString(),
    });
  }
}
