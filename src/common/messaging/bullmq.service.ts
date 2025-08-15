import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

export interface JobData {
  [key: string]: any;
}

export interface QueueConfig {
  name: string;
  processor?: (job: Job<JobData>) => Promise<void>;
}

@Injectable()
export class BullMQService implements OnModuleInit {
  private readonly logger = new Logger(BullMQService.name);
  private redis: Redis;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  constructor() {
    if (process.env.NODE_ENV === 'test') {
      this.logger.warn('BullMQ disabled in test environment');
      return;
    }

    try {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    } catch (error) {
      this.logger.error('Failed to initialize Redis connection:', error.message);
    }
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test' || !this.redis) {
      return;
    }
  }

  createQueue(config: QueueConfig): Queue {
    if (this.queues.has(config.name)) {
      return this.queues.get(config.name)!;
    }

    if (!this.redis) {
      this.logger.warn(`Cannot create queue ${config.name} - Redis not available`);
      return null;
    }

    try {
      const queue = new Queue(config.name, {
        connection: this.redis,
      });

      this.queues.set(config.name, queue);

      if (config.processor) {
        this.createWorker(config.name, config.processor);
      }

      return queue;
    } catch (error) {
      this.logger.error(`Failed to create queue ${config.name}:`, error.message);
      return null;
    }
  }

  createWorker(queueName: string, processor: (job: Job<JobData>) => Promise<void>): Worker {
    if (this.workers.has(queueName)) {
      return this.workers.get(queueName)!;
    }

    if (!this.redis) {
      this.logger.warn(`Cannot create worker for ${queueName} - Redis not available`);
      return null;
    }

    try {
      const worker = new Worker(queueName, processor, {
        connection: this.redis,
      });

      worker.on('completed', (job) => {
        this.logger.log(`Job ${job.id} in queue ${queueName} completed`);
      });

      worker.on('failed', (job, err) => {
        this.logger.error(`Job ${job?.id} in queue ${queueName} failed:`, err.message);
      });

      this.workers.set(queueName, worker);
      return worker;
    } catch (error) {
      this.logger.error(`Failed to create worker for ${queueName}:`, error.message);
      return null;
    }
  }

  async addJob(queueName: string, jobName: string, data: JobData, options?: any) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      this.logger.warn(`Queue ${queueName} not found - job ${jobName} skipped`);
      return null;
    }

    return queue.add(jobName, data, {
      removeOnComplete: 100,
      removeOnFail: 50,
      ...options,
    });
  }

  async getQueueStats(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      };
    }

    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}
