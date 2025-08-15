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
      await this.consumer.subscribe({ topic: 'email.events' });

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
