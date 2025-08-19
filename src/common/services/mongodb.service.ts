import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';

@Injectable()
export class MongoDbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoDbService.name);
  private client: MongoClient;
  private db: Db;

  constructor() {
    const url = process.env.MONGODB_URL || 'mongodb://localhost:27017';
    // Add auth source for authentication with Docker MongoDB
    const options = {
      authSource: 'admin', // Use admin database for authentication
      maxPoolSize: process.env.MONGODB_MAX_POOL_SIZE
        ? Number(process.env.MONGODB_MAX_POOL_SIZE)
        : undefined,
      minPoolSize: process.env.MONGODB_MIN_POOL_SIZE
        ? Number(process.env.MONGODB_MIN_POOL_SIZE)
        : undefined,
      maxIdleTimeMS: process.env.MONGODB_MAX_IDLE_TIME_MS
        ? Number(process.env.MONGODB_MAX_IDLE_TIME_MS)
        : undefined,
      waitQueueTimeoutMS: process.env.MONGODB_WAIT_QUEUE_TIMEOUT_MS
        ? Number(process.env.MONGODB_WAIT_QUEUE_TIMEOUT_MS)
        : undefined,
    } as const;
    this.client = new MongoClient(url, options);
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      this.logger.warn('MongoDB disabled in test environment');
      return;
    }

    try {
      await this.client.connect();
      this.db = this.client.db('nestjs-app');
      this.logger.log('MongoDB connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB:', error.message);
      // Don't throw in production - allow app to start without MongoDB
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn('MongoDB unavailable - continuing without MongoDB');
      }
    }
  }

  async onModuleDestroy() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    try {
      if (this.client) {
        await this.client.close();
        this.logger.log('MongoDB disconnected successfully');
      }
    } catch (error) {
      this.logger.error('Failed to disconnect from MongoDB:', error.message);
    }
  }

  getDb(): Db {
    return this.db;
  }

  getClient(): MongoClient {
    return this.client;
  }
}
