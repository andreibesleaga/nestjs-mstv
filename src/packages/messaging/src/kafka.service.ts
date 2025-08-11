import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor() {
    // Suppress Kafka partitioner warning
    process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
    
    this.kafka = new Kafka({
      clientId: 'nestjs-app',
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'nestjs-consumer-group' });
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      this.logger.warn('Kafka disabled in test environment');
      return;
    }

    try {
      await this.producer.connect();
      await this.consumer.connect();

      // Subscribe to topics
      await this.consumer.subscribe({ topic: 'user.events' });
      await this.consumer.subscribe({ topic: 'auth.events' });

      // Start consuming
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const messageValue = message.value?.toString();
            const parsedMessage = messageValue ? JSON.parse(messageValue) : null;
            this.logger.log(`Received message on ${topic}:`, {
              partition,
              offset: message.offset,
              event: parsedMessage?.event,
              timestamp: parsedMessage?.timestamp,
            });
          } catch (error) {
            this.logger.error(`Failed to process message from ${topic}:`, error);
          }
        },
      });
      this.logger.log('Kafka service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Kafka service:', error.message);
      // Don't throw in production - allow app to start without Kafka
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn('Kafka unavailable - continuing without messaging');
      }
    }
  }

  async publishMessage(topic: string, message: Record<string, any>) {
    if (process.env.NODE_ENV === 'test' || !this.producer) {
      this.logger.warn(`Kafka unavailable - message to ${topic} skipped`);
      return;
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify(message),
          },
        ],
      });
      this.logger.log(`Message published to ${topic}:`, {
        event: message.event,
        timestamp: message.timestamp,
      });
    } catch (error) {
      this.logger.error(`Failed to publish message to ${topic}:`, error.message);
      // Don't throw in production - log and continue
    }
  }

  // User Events
  async publishUserRegistered(userId: string, email: string, name?: string, role = 'user') {
    await this.publishMessage('user.events', {
      event: 'user.registered',
      userId,
      email,
      name,
      role,
      timestamp: new Date().toISOString(),
    });
  }

  async publishUserUpdated(userId: string, changes: Record<string, any>) {
    await this.publishMessage('user.events', {
      event: 'user.updated',
      userId,
      changes,
      timestamp: new Date().toISOString(),
    });
  }

  async publishUserDeleted(userId: string, email: string, deletedBy?: string) {
    await this.publishMessage('user.events', {
      event: 'user.deleted',
      userId,
      email,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  // Auth Events
  async publishUserLoggedIn(userId: string, sessionId?: string, ipAddress?: string, userAgent?: string) {
    await this.publishMessage('auth.events', {
      event: 'user.logged_in',
      userId,
      sessionId,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  }

  async publishUserLoggedOut(userId: string, sessionId?: string) {
    await this.publishMessage('auth.events', {
      event: 'user.logged_out',
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  async publishTokenRefreshed(userId: string, tokenId?: string) {
    await this.publishMessage('auth.events', {
      event: 'token.refreshed',
      userId,
      tokenId,
      timestamp: new Date().toISOString(),
    });
  }

  // Email Events
  async publishEmailWelcome(userId: string, email: string, name?: string) {
    await this.publishMessage('email.events', {
      event: 'email.welcome',
      userId,
      email,
      name,
      timestamp: new Date().toISOString(),
    });
  }

  async publishEmailPasswordReset(userId: string, email: string, resetToken: string, expiresAt: string) {
    await this.publishMessage('email.events', {
      event: 'email.password_reset',
      userId,
      email,
      resetToken,
      expiresAt,
      timestamp: new Date().toISOString(),
    });
  }

  async publishEmailVerification(userId: string, email: string, verificationToken: string) {
    await this.publishMessage('email.events', {
      event: 'email.verification',
      userId,
      email,
      verificationToken,
      timestamp: new Date().toISOString(),
    });
  }

  async onModuleDestroy() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    try {
      if (this.producer) {
        await this.producer.disconnect();
      }
      if (this.consumer) {
        await this.consumer.disconnect();
      }
      this.logger.log('Kafka service disconnected successfully');
    } catch (error) {
      this.logger.error('Failed to disconnect Kafka service:', error.message);
    }
  }
}
