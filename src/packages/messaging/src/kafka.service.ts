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
    await this.producer.connect();
    await this.consumer.connect();

    // Subscribe to topics
    await this.consumer.subscribe({ topic: 'user.events' });
    await this.consumer.subscribe({ topic: 'auth.events' });

    // Start consuming
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log(`Received message on ${topic}:`, {
          partition,
          offset: message.offset,
          value: message.value?.toString(),
        });
      },
    });
  }

  async publishMessage(topic: string, message: any) {
    await this.producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(message),
        },
      ],
    });
  }

  async publishUserRegistered(userId: string, email: string) {
    await this.publishMessage('user.events', {
      event: 'user.registered',
      userId,
      email,
      timestamp: new Date().toISOString(),
    });
  }

  async publishUserLoggedIn(userId: string) {
    await this.publishMessage('auth.events', {
      event: 'user.logged_in',
      userId,
      timestamp: new Date().toISOString(),
    });
  }
}
