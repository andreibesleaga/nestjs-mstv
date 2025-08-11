import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'nestjs-app',
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'nestjs-consumer-group' });
  }

  async onModuleInit() {
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
            console.log(`Received message on ${topic}:`, {
              partition,
              offset: message.offset,
              event: parsedMessage?.event,
              timestamp: parsedMessage?.timestamp,
            });
          } catch (error) {
            console.error(`Failed to process message from ${topic}:`, error);
          }
        },
      });
      console.log('Kafka service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Kafka service:', error);
      throw error;
    }
  }

  async publishMessage(topic: string, message: Record<string, any>) {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify(message),
          },
        ],
      });
      console.log(`Message published to ${topic}:`, {
        event: message.event,
        timestamp: message.timestamp,
      });
    } catch (error) {
      console.error(`Failed to publish message to ${topic}:`, error);
      throw error;
    }
  }

  async publishUserEvent(event: string, userId: string, additionalData: Record<string, any> = {}) {
    const topic = event.startsWith('user.') ? 'user.events' : 'auth.events';
    await this.publishMessage(topic, {
      event,
      userId,
      ...additionalData,
      timestamp: new Date().toISOString(),
    });
  }

  async publishUserRegistered(userId: string, email: string) {
    await this.publishUserEvent('user.registered', userId, { email });
  }

  async publishUserLoggedIn(userId: string) {
    await this.publishUserEvent('user.logged_in', userId);
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      console.log('Kafka service disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect Kafka service:', error);
    }
  }
}
