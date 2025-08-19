import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, BehaviorSubject } from 'rxjs';
import { KafkaService } from '../messaging/kafka.service';
import { BullMQService } from '../messaging/bullmq.service';
import { MqttService } from '../../protocols/mqtt.service';
import { TransportManager } from './transport.manager';
import { StreamingManager } from './streaming.manager';
import { SchedulerManager } from './scheduler.manager';
import { CacheManager } from './cache.manager';
import { StreamingMessage } from '../types';

export interface MicroserviceConfig {
  transport: any;
  options: any;
  enabled: boolean;
}

export { StreamingMessage };

@Injectable()
export class MicroserviceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MicroserviceService.name);
  private isInitialized = false;
  private readonly statusSubject = new BehaviorSubject<{ 
    status: string; 
    transports: string[];
    streaming: boolean;
    scheduler: boolean;
    cache: boolean;
  }>({
    status: 'initializing',
    transports: [],
    streaming: false,
    scheduler: false,
    cache: false,
  });

  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaService: KafkaService,
    private readonly bullMQService: BullMQService,
    @Optional() private readonly mqttService: MqttService | null,
    private readonly transportManager: TransportManager,
    private readonly streamingManager: StreamingManager,
    private readonly schedulerManager: SchedulerManager,
    private readonly cacheManager: CacheManager,
  ) {}

  async onModuleInit() {
    try {
      if (process.env.NODE_ENV === 'test') {
        await this.initializeForTesting();
      } else {
        await this.initializeServices();
      }
      this.isInitialized = true;
      this.logger.log('MicroserviceService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MicroserviceService', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.destroyServices();
  }

  // ============================================================================
  // Initialization Methods
  // ============================================================================

  private async initializeForTesting() {
    if (!this.isInitialized) {
      await this.cacheManager.initialize();
      await this.streamingManager.initialize();
      await this.schedulerManager.initialize();
      
      this.statusSubject.next({
        status: 'ready',
        transports: ['test-mode'],
        streaming: true,
        scheduler: true,
        cache: true,
      });
      
      this.isInitialized = true;
      this.logger.log('MicroserviceService initialized for testing');
    }
  }

  private async initializeServices() {
    const enabledServices: string[] = [];

    // Initialize core managers
    await this.cacheManager.initialize();
    enabledServices.push('Cache');

    await this.streamingManager.initialize();
    enabledServices.push('Streaming');

    await this.schedulerManager.initialize();
    enabledServices.push('Scheduler');

    // Initialize transport manager
    await this.transportManager.initialize();
    const transports = this.transportManager.getTransportNames();
    enabledServices.push(...transports);

    // Initialize messaging services if enabled
    if (this.configService.get<boolean>('ENABLE_KAFKA', false)) {
      // TODO: Initialize Kafka service when proper method is available
      enabledServices.push('Kafka');
    }

    if (this.configService.get<boolean>('ENABLE_BULLMQ', false)) {
      // TODO: Initialize BullMQ service when proper method is available
      enabledServices.push('BullMQ');
    }

    this.statusSubject.next({
      status: 'ready',
      transports: enabledServices,
      streaming: true,
      scheduler: true,
      cache: true,
    });

    this.logger.log(`Initialized services: ${enabledServices.join(', ')}`);
  }

  private async destroyServices() {
    try {
      await this.schedulerManager.destroy();
      await this.streamingManager.destroy();
      await this.cacheManager.destroy();
      await this.transportManager.destroy();
      
      this.statusSubject.complete();
      this.logger.log('MicroserviceService destroyed successfully');
    } catch (error) {
      this.logger.error('Error during MicroserviceService destruction', error);
    }
  }

  // ============================================================================
  // Transport Methods (delegated to TransportManager)
  // ============================================================================

  send<T = any>(pattern: string, data: any, transport = 'tcp'): Observable<T> {
    return this.transportManager.send<T>(pattern, data, transport);
  }

  emit<T = any>(pattern: string, data: any, transport = 'tcp'): Observable<T> {
    return this.transportManager.emit<T>(pattern, data, transport);
  }

  getTransportNames(): string[] {
    return this.transportManager.getTransportNames();
  }

  // ============================================================================
  // Streaming Methods (delegated to StreamingManager)
  // ============================================================================

  publishToStream<T extends Record<string, unknown> = Record<string, unknown>>(
    channel: string, 
    data: T, 
    source = 'system'
  ): void {
    this.streamingManager.publish(channel, data, source);
  }

  subscribeToStream<T extends Record<string, unknown> = Record<string, unknown>>(
    channel: string
  ): Observable<StreamingMessage<T>> {
    return this.streamingManager.subscribe<T>(channel);
  }

  createStreamingChannel(channel: string): void {
    this.streamingManager.createChannel(channel);
  }

  getStreamingChannels(): string[] {
    return this.streamingManager.getChannels();
  }

  // ============================================================================
  // Scheduler Methods (delegated to SchedulerManager)
  // ============================================================================

  addScheduledJob(
    name: string,
    cronPattern: string,
    task: () => Promise<void> | void,
    options: {
      timezone?: string;
      startNow?: boolean;
      maxRetries?: number;
    } = {}
  ): void {
    this.schedulerManager.addJob(name, cronPattern, task, options);
  }

  removeScheduledJob(name: string): boolean {
    return this.schedulerManager.removeJob(name);
  }

  startScheduledJob(name: string): boolean {
    return this.schedulerManager.startJob(name);
  }

  stopScheduledJob(name: string): boolean {
    return this.schedulerManager.stopJob(name);
  }

  getScheduledJobNames(): string[] {
    return this.schedulerManager.getJobNames();
  }

  // ============================================================================
  // Cache Methods (delegated to CacheManager)
  // ============================================================================

  setCache<T>(key: string, value: T, ttlMs?: number): void {
    this.cacheManager.set(key, value, ttlMs);
  }

  getCache<T>(key: string): T | undefined {
    return this.cacheManager.get<T>(key);
  }

  hasCache(key: string): boolean {
    return this.cacheManager.has(key);
  }

  deleteCache(key: string): boolean {
    return this.cacheManager.delete(key);
  }

  clearCache(): void {
    this.cacheManager.clear();
  }

  getCacheStats() {
    return this.cacheManager.getStats();
  }

  // ============================================================================
  // Legacy Methods (for backward compatibility)
  // ============================================================================

  async publishMqttMessage(topic: string, message: Record<string, unknown>): Promise<void> {
    if (this.mqttService) {
      await this.mqttService.publishUserEvent('user', JSON.stringify(message), {});
      this.logger.debug(`Published MQTT message to topic: ${topic}`);
    } else {
      this.logger.warn('MQTT service not available');
    }
  }

  // ============================================================================
  // Backward Compatibility Methods
  // ============================================================================

  async sendMessage(pattern: string, data: any, transport = 'tcp'): Promise<any> {
    return this.send(pattern, data, transport).toPromise();
  }

  async emitEvent(pattern: string, data: any, transport = 'tcp'): Promise<void> {
    this.emit(pattern, data, transport).subscribe();
  }

  async sendKafkaMessage(topic: string, data: any): Promise<void> {
    try {
      await this.kafkaService.publishMessage(topic, data);
      this.logger.debug(`Published Kafka message to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to publish Kafka message to topic ${topic}:`, error);
      throw error;
    }
  }

  async addQueueJob(queueName: string, jobName: string, data: any, options?: any): Promise<void> {
    try {
      await this.bullMQService.addJob(queueName, jobName, data, options);
      this.logger.debug(`Added job ${jobName} to queue ${queueName}`);
    } catch (error) {
      this.logger.error(`Failed to add job ${jobName} to queue ${queueName}:`, error);
      throw error;
    }
  }

  streamData(channel: string, data: any): void {
    this.publishToStream(channel, data, 'legacy');
  }

  addCronJob(name: string, cronTime: string, callback: () => void): void {
    this.addScheduledJob(name, cronTime, callback);
  }

  removeCronJob(name: string): void {
    this.removeScheduledJob(name);
  }

  getAvailableTransports(): string[] {
    return this.getTransportNames();
  }

  // ============================================================================
  // Status and Metrics
  // ============================================================================

  getStatus(): Observable<{
    status: string;
    transports: string[];
    streaming: boolean;
    scheduler: boolean;
    cache: boolean;
  }> {
    return this.statusSubject.asObservable();
  }

  getMetrics() {
    return {
      status: this.statusSubject.value,
      transport: this.transportManager.getMetrics(),
      streaming: this.streamingManager.getMetrics(),
      scheduler: this.schedulerManager.getMetrics(),
      cache: this.cacheManager.getStats(),
    };
  }

  isReady(): boolean {
    return this.isInitialized && this.statusSubject.value.status === 'ready';
  }
}
