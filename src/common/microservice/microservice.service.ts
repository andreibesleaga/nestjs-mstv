import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  MicroserviceOptions, 
  Transport, 
  ClientProxy, 
  ClientProxyFactory 
} from '@nestjs/microservices';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { KafkaService } from '../messaging/kafka.service';
import { BullMQService } from '../messaging/bullmq.service';
import { MqttService } from '../../protocols/mqtt.service';

export interface MicroserviceConfig {
  transport: Transport;
  options: any;
  enabled: boolean;
}

export interface StreamingMessage {
  id: string;
  data: any;
  timestamp: Date;
  source: string;
}

@Injectable()
export class MicroserviceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MicroserviceService.name);
  private clients: Map<string, ClientProxy> = new Map();
  private streamingSubjects: Map<string, Subject<StreamingMessage>> = new Map();
  private isInitialized = false;
  private readonly statusSubject = new BehaviorSubject<{ status: string; transports: string[] }>({
    status: 'initializing',
    transports: []
  });

  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaService: KafkaService,
    private readonly bullMQService: BullMQService,
    private readonly mqttService: MqttService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    try {
      await this.initializeMicroservices();
      this.isInitialized = true;
      this.logger.log('Microservice service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize microservice service', error);
      throw error;
    }
  }

  /**
   * Manual initialization for testing purposes
   */
  async initializeForTesting() {
    if (!this.isInitialized) {
      // For testing, only initialize streaming and scheduler, skip transport connections
      await this.initializeStreaming();
      await this.initializeScheduledTasks();
      
      this.statusSubject.next({
        status: 'ready',
        transports: ['test-mode']
      });
      
      this.isInitialized = true;
      this.logger.log('Microservice service initialized for testing');
    }
  }

  async onModuleDestroy() {
    await this.cleanup();
  }

  /**
   * Initialize all enabled microservice transports
   */
  private async initializeMicroservices() {
    const enabledTransports: string[] = [];

    // Initialize TCP transport
    if (this.configService.get<boolean>('ENABLE_TCP_MICROSERVICE', false)) {
      await this.initializeTCP();
      enabledTransports.push('TCP');
    }

    // Initialize Redis transport
    if (this.configService.get<boolean>('ENABLE_REDIS_MICROSERVICE', true)) {
      await this.initializeRedis();
      enabledTransports.push('Redis');
    }

    // Initialize NATS transport
    if (this.configService.get<boolean>('ENABLE_NATS_MICROSERVICE', false)) {
      await this.initializeNATS();
      enabledTransports.push('NATS');
    }

    // Initialize RabbitMQ transport
    if (this.configService.get<boolean>('ENABLE_RABBITMQ_MICROSERVICE', false)) {
      await this.initializeRabbitMQ();
      enabledTransports.push('RabbitMQ');
    }

    // Initialize gRPC transport
    if (this.configService.get<boolean>('ENABLE_GRPC', false)) {
      await this.initializeGRPC();
      enabledTransports.push('gRPC');
    }

    // Initialize streaming channels
    await this.initializeStreaming();
    enabledTransports.push('Streaming');

    // Initialize scheduled tasks
    await this.initializeScheduledTasks();
    enabledTransports.push('Scheduler');

    this.statusSubject.next({
      status: 'ready',
      transports: enabledTransports
    });

    this.logger.log(`Initialized microservice transports: ${enabledTransports.join(', ')}`);
  }

  /**
   * Initialize TCP transport
   */
  private async initializeTCP() {
    const config: MicroserviceConfig = {
      transport: Transport.TCP,
      options: {
        host: this.configService.get<string>('TCP_HOST', 'localhost'),
        port: this.configService.get<number>('TCP_PORT', 3001),
        retryAttempts: this.configService.get<number>('TCP_RETRY_ATTEMPTS', 5),
        retryDelay: this.configService.get<number>('TCP_RETRY_DELAY', 3000),
      },
      enabled: true
    };

    const client = ClientProxyFactory.create(config);
    this.clients.set('tcp', client);
    await client.connect();
    this.logger.log('TCP microservice client initialized');
  }

  /**
   * Initialize Redis transport
   */
  private async initializeRedis() {
    const config: MicroserviceConfig = {
      transport: Transport.REDIS,
      options: {
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
        retryAttempts: this.configService.get<number>('REDIS_RETRY_ATTEMPTS', 5),
        retryDelay: this.configService.get<number>('REDIS_RETRY_DELAY', 3000),
      },
      enabled: true
    };

    const client = ClientProxyFactory.create(config);
    this.clients.set('redis', client);
    await client.connect();
    this.logger.log('Redis microservice client initialized');
  }

  /**
   * Initialize NATS transport
   */
  private async initializeNATS() {
    const config: MicroserviceConfig = {
      transport: Transport.NATS,
      options: {
        servers: this.configService.get<string[]>('NATS_SERVERS', ['nats://localhost:4222']),
        user: this.configService.get<string>('NATS_USER'),
        pass: this.configService.get<string>('NATS_PASS'),
        token: this.configService.get<string>('NATS_TOKEN'),
        retryAttempts: this.configService.get<number>('NATS_RETRY_ATTEMPTS', 5),
        retryDelay: this.configService.get<number>('NATS_RETRY_DELAY', 3000),
      },
      enabled: true
    };

    const client = ClientProxyFactory.create(config);
    this.clients.set('nats', client);
    await client.connect();
    this.logger.log('NATS microservice client initialized');
  }

  /**
   * Initialize RabbitMQ transport
   */
  private async initializeRabbitMQ() {
    const config: MicroserviceConfig = {
      transport: Transport.RMQ,
      options: {
        urls: [this.configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672')],
        queue: this.configService.get<string>('RABBITMQ_QUEUE', 'nestjs_queue'),
        queueOptions: {
          durable: this.configService.get<boolean>('RABBITMQ_DURABLE', true),
        },
        socketOptions: {
          heartbeatIntervalInSeconds: this.configService.get<number>('RABBITMQ_HEARTBEAT', 60),
          reconnectTimeInSeconds: this.configService.get<number>('RABBITMQ_RECONNECT', 5),
        },
        retryAttempts: this.configService.get<number>('RABBITMQ_RETRY_ATTEMPTS', 5),
        retryDelay: this.configService.get<number>('RABBITMQ_RETRY_DELAY', 3000),
      },
      enabled: true
    };

    const client = ClientProxyFactory.create(config);
    this.clients.set('rabbitmq', client);
    await client.connect();
    this.logger.log('RabbitMQ microservice client initialized');
  }

  /**
   * Initialize gRPC transport
   */
  private async initializeGRPC() {
    const config: MicroserviceConfig = {
      transport: Transport.GRPC,
      options: {
        package: this.configService.get<string>('GRPC_PACKAGE', 'nestjs'),
        protoPath: this.configService.get<string>('GRPC_PROTO_PATH', './src/protocols/grpc/proto/user.proto'),
        url: `${this.configService.get<string>('GRPC_HOST', 'localhost')}:${this.configService.get<number>('GRPC_PORT', 5000)}`,
        maxSendMessageLength: this.configService.get<number>('GRPC_MAX_SEND_MESSAGE_LENGTH', 4 * 1024 * 1024),
        maxReceiveMessageLength: this.configService.get<number>('GRPC_MAX_RECEIVE_MESSAGE_LENGTH', 4 * 1024 * 1024),
        retryAttempts: this.configService.get<number>('GRPC_RETRY_ATTEMPTS', 5),
        retryDelay: this.configService.get<number>('GRPC_RETRY_DELAY', 3000),
      },
      enabled: true
    };

    const client = ClientProxyFactory.create(config);
    this.clients.set('grpc', client);
    await client.connect();
    this.logger.log('gRPC microservice client initialized');
  }

  /**
   * Initialize streaming channels
   */
  private async initializeStreaming() {
    // Create streaming subjects for different data types
    const streamingChannels = [
      'user-events',
      'system-metrics',
      'audit-logs',
      'notifications',
      'real-time-data'
    ];

    for (const channel of streamingChannels) {
      this.streamingSubjects.set(channel, new Subject<StreamingMessage>());
    }

    this.logger.log(`Initialized streaming channels: ${streamingChannels.join(', ')}`);
  }

  /**
   * Initialize scheduled tasks
   */
  private async initializeScheduledTasks() {
    // Example scheduled tasks - these would be configured via environment variables
    if (this.configService.get<boolean>('ENABLE_HEALTH_CHECK_CRON', true)) {
      this.addCronJob('health-check', '*/30 * * * *', this.healthCheckTask.bind(this));
    }

    if (this.configService.get<boolean>('ENABLE_METRICS_COLLECTION_CRON', false)) {
      this.addCronJob('metrics-collection', '*/5 * * * *', this.metricsCollectionTask.bind(this));
    }

    if (this.configService.get<boolean>('ENABLE_CLEANUP_CRON', false)) {
      this.addCronJob('cleanup', '0 2 * * *', this.cleanupTask.bind(this));
    }

    this.logger.log('Scheduled tasks initialized');
  }

  /**
   * Send message via specific transport
   */
  async sendMessage(transport: string, pattern: string, data: any): Promise<any> {
    const client = this.clients.get(transport);
    if (!client) {
      throw new Error(`Transport ${transport} not found or not initialized`);
    }

    try {
      return await client.send(pattern, data).toPromise();
    } catch (error) {
      this.logger.error(`Failed to send message via ${transport}`, error);
      throw error;
    }
  }

  /**
   * Emit event via specific transport
   */
  async emitEvent(transport: string, pattern: string, data: any): Promise<void> {
    const client = this.clients.get(transport);
    if (!client) {
      throw new Error(`Transport ${transport} not found or not initialized`);
    }

    try {
      client.emit(pattern, data);
    } catch (error) {
      this.logger.error(`Failed to emit event via ${transport}`, error);
      throw error;
    }
  }

  /**
   * Send message via Kafka (using existing KafkaService)
   */
  async sendKafkaMessage(topic: string, data: any): Promise<void> {
    try {
      await this.kafkaService.publishMessage(topic, data);
    } catch (error) {
      this.logger.error('Failed to send Kafka message', error);
      throw error;
    }
  }

  /**
   * Add job to queue (using existing BullMQService)
   */
  async addQueueJob(queueName: string, jobName: string, data: any, options?: any): Promise<void> {
    try {
      await this.bullMQService.addJob(queueName, jobName, data, options);
    } catch (error) {
      this.logger.error('Failed to add queue job', error);
      throw error;
    }
  }

  /**
   * Publish MQTT message (using existing MqttService)
   */
  async publishMqttMessage(topic: string, message: string): Promise<void> {
    try {
      await this.mqttService.publish(topic, message);
    } catch (error) {
      this.logger.error('Failed to publish MQTT message', error);
      throw error;
    }
  }

  /**
   * Stream data to a specific channel
   */
  streamData(channel: string, data: any): void {
    const subject = this.streamingSubjects.get(channel);
    if (!subject) {
      throw new Error(`Streaming channel ${channel} not found`);
    }

    const message: StreamingMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      data,
      timestamp: new Date(),
      source: channel
    };

    subject.next(message);
    this.logger.debug(`Streamed data to channel: ${channel}`);
  }

  /**
   * Subscribe to streaming channel
   */
  subscribeToStream(channel: string): Observable<StreamingMessage> {
    const subject = this.streamingSubjects.get(channel);
    if (!subject) {
      throw new Error(`Streaming channel ${channel} not found`);
    }
    return subject.asObservable();
  }

  /**
   * Add a cron job
   */
  addCronJob(name: string, cronTime: string, callback: () => void): void {
    try {
      const job = new (require('cron').CronJob)(cronTime, callback);
      this.schedulerRegistry.addCronJob(name, job);
      job.start();
      this.logger.log(`Added cron job: ${name} with schedule: ${cronTime}`);
    } catch (error) {
      this.logger.error(`Failed to add cron job: ${name}`, error);
      throw error;
    }
  }

  /**
   * Remove a cron job
   */
  removeCronJob(name: string): void {
    try {
      this.schedulerRegistry.deleteCronJob(name);
      this.logger.log(`Removed cron job: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to remove cron job: ${name}`, error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus(): Observable<{ status: string; transports: string[] }> {
    return this.statusSubject.asObservable();
  }

  /**
   * Get list of available transports
   */
  getAvailableTransports(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get streaming channels
   */
  getStreamingChannels(): string[] {
    return Array.from(this.streamingSubjects.keys());
  }

  /**
   * Health check task
   */
  @Cron('*/30 * * * *', { name: 'health-check' })
  private async healthCheckTask(): Promise<void> {
    try {
      this.logger.debug('Running health check task');
      // Perform health checks on all transports
      for (const [transport, client] of this.clients.entries()) {
        try {
          // Simple ping to check if transport is alive
          await client.send('health.ping', {}).toPromise();
          this.logger.debug(`Health check passed for transport: ${transport}`);
        } catch (error) {
          this.logger.warn(`Health check failed for transport: ${transport}`, error);
        }
      }
    } catch (error) {
      this.logger.error('Health check task failed', error);
    }
  }

  /**
   * Metrics collection task
   */
  @Cron('*/5 * * * *', { name: 'metrics-collection' })
  private async metricsCollectionTask(): Promise<void> {
    try {
      this.logger.debug('Running metrics collection task');
      
      const metrics = {
        timestamp: new Date(),
        activeTransports: this.getAvailableTransports().length,
        streamingChannels: this.getStreamingChannels().length,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      };

      // Stream metrics data
      this.streamData('system-metrics', metrics);
      
      // Could also send to external monitoring system
      if (this.configService.get<boolean>('ENABLE_EXTERNAL_METRICS', false)) {
        await this.sendMessage('redis', 'metrics.collect', metrics);
      }
      
    } catch (error) {
      this.logger.error('Metrics collection task failed', error);
    }
  }

  /**
   * Cleanup task
   */
  @Cron('0 2 * * *', { name: 'cleanup' })
  private async cleanupTask(): Promise<void> {
    try {
      this.logger.log('Running cleanup task');
      
      // Cleanup old streaming messages (if needed)
      // Cleanup old queue jobs
      // Cleanup temporary files
      // etc.
      
      this.logger.log('Cleanup task completed');
    } catch (error) {
      this.logger.error('Cleanup task failed', error);
    }
  }

  /**
   * Cleanup all resources
   */
  private async cleanup(): Promise<void> {
    this.logger.log('Cleaning up microservice service...');

    // Close all client connections
    for (const [transport, client] of this.clients.entries()) {
      try {
        await client.close();
        this.logger.log(`Closed ${transport} client`);
      } catch (error) {
        this.logger.error(`Failed to close ${transport} client`, error);
      }
    }

    // Complete all streaming subjects
    for (const [channel, subject] of this.streamingSubjects.entries()) {
      try {
        subject.complete();
        this.logger.log(`Completed streaming channel: ${channel}`);
      } catch (error) {
        this.logger.error(`Failed to complete streaming channel: ${channel}`, error);
      }
    }

    // Remove all cron jobs
    const cronJobs = this.schedulerRegistry.getCronJobs();
    for (const [name] of cronJobs.entries()) {
      try {
        this.schedulerRegistry.deleteCronJob(name);
        this.logger.log(`Removed cron job: ${name}`);
      } catch (error) {
        this.logger.error(`Failed to remove cron job: ${name}`, error);
      }
    }

    this.statusSubject.next({ status: 'shutdown', transports: [] });
    this.statusSubject.complete();

    this.logger.log('Microservice service cleanup completed');
  }
}
