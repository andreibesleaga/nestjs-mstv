import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MicroserviceService } from '../../src/common/microservice/microservice.service';
import { KafkaService } from '../../src/common/messaging/kafka.service';
import { BullMQService } from '../../src/common/messaging/bullmq.service';
import { MqttService } from '../../src/protocols/mqtt.service';
import { TransportManager } from '../../src/common/microservice/transport.manager';
import { StreamingManager } from '../../src/common/microservice/streaming.manager';
import { SchedulerManager } from '../../src/common/microservice/scheduler.manager';
import { CacheManager } from '../../src/common/microservice/cache.manager';

describe('MicroserviceService Integration Tests', () => {
  let service: MicroserviceService;
  let module: TestingModule;
  let kafkaService: jest.Mocked<KafkaService>;
  let bullMQService: jest.Mocked<BullMQService>;

  beforeEach(async () => {
    const mockKafkaService = {
      publishMessage: jest.fn(),
      subscribeToEvents: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
    };

    const mockBullMQService = {
      addJob: jest.fn(),
      processJobs: jest.fn(),
      isHealthy: jest.fn().mockReturnValue(true),
    };

    const mockTransportManager = {
      initialize: jest.fn(),
      destroy: jest.fn(),
      getTransportNames: jest.fn().mockReturnValue(['tcp', 'redis']),
      send: jest.fn(),
      emit: jest.fn(),
    };

    const streamingChannels: string[] = [];
    const mockStreamingManager = {
      initialize: jest.fn(),
      destroy: jest.fn(),
      publish: jest.fn(),
      subscribe: jest
        .fn()
        .mockReturnValue({ subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }) }),
      createChannel: jest.fn((ch: string) => {
        if (!streamingChannels.includes(ch)) streamingChannels.push(ch);
      }),
      getChannels: jest.fn(() => streamingChannels),
    };

    const jobNames: string[] = [];
    const mockSchedulerManager = {
      initialize: jest.fn(),
      destroy: jest.fn(),
      addJob: jest.fn((name: string) => {
        if (!jobNames.includes(name)) jobNames.push(name);
      }),
      removeJob: jest.fn((name: string) => {
        const idx = jobNames.indexOf(name);
        if (idx >= 0) {
          jobNames.splice(idx, 1);
          return true;
        }
        return false;
      }),
      startJob: jest.fn().mockReturnValue(true),
      stopJob: jest.fn().mockReturnValue(true),
      getJobNames: jest.fn(() => jobNames),
    };

    const cacheStore = new Map<string, any>();
    const mockCacheManager = {
      initialize: jest.fn(),
      destroy: jest.fn(),
      set: jest.fn((key: string, value: any) => {
        cacheStore.set(key, value);
      }),
      get: jest.fn((key: string) => cacheStore.get(key)),
      has: jest.fn((key: string) => cacheStore.has(key)),
      delete: jest.fn((key: string) => cacheStore.delete(key)),
      clear: jest.fn(() => cacheStore.clear()),
      getStats: jest.fn().mockReturnValue({ size: () => cacheStore.size }),
    };

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.example',
        }),
      ],
      providers: [
        MicroserviceService,
        {
          provide: KafkaService,
          useValue: mockKafkaService,
        },
        {
          provide: BullMQService,
          useValue: mockBullMQService,
        },
        {
          provide: MqttService,
          useValue: null,
        },
  { provide: TransportManager, useValue: mockTransportManager },
  { provide: StreamingManager, useValue: mockStreamingManager },
  { provide: SchedulerManager, useValue: mockSchedulerManager },
  { provide: CacheManager, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<MicroserviceService>(MicroserviceService);
    kafkaService = module.get(KafkaService);
    bullMQService = module.get(BullMQService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with proper dependencies', () => {
      expect(kafkaService).toBeDefined();
      expect(bullMQService).toBeDefined();
    });
  });

  describe('Transport Management', () => {
    it('should handle transport operations', () => {
      const transportNames = service.getTransportNames();
      expect(Array.isArray(transportNames)).toBe(true);
    });

    it('should handle streaming subscriptions', () => {
      const topic = 'test-topic';
      
      const subscription = service.subscribeToStream(topic);
      expect(subscription).toBeDefined();
      
      // Should be able to publish to stream
      service.publishToStream(topic, { test: 'data' });
      
      // Clean up subscription
      subscription.subscribe().unsubscribe();
    });

    it('should manage streaming channels', () => {
      const channel = 'test-channel';
      
      service.createStreamingChannel(channel);
      const channels = service.getStreamingChannels();
      
      expect(channels).toContain(channel);
    });
  });

  describe('Message Publishing', () => {
    it('should publish Kafka events when enabled', async () => {
      const eventData = { userId: '123', action: 'test' };
      
      await service.sendKafkaMessage('user.created', eventData);
      
      expect(kafkaService.publishMessage).toHaveBeenCalledWith(
        'user.created',
        eventData
      );
    });

    it('should handle Kafka publishing errors gracefully', async () => {
      kafkaService.publishMessage.mockRejectedValue(new Error('Kafka error'));
      
      await expect(
        service.sendKafkaMessage('user.created', { test: 'data' })
      ).rejects.toThrow('Kafka error');
    });

    it('should publish BullMQ jobs when enabled', async () => {
      const jobData = { email: 'test@example.com', template: 'welcome' };
      
      await service.addQueueJob('email', 'send-email', jobData);
      
      expect(bullMQService.addJob).toHaveBeenCalledWith('email', 'send-email', jobData, undefined);
    });
  });

  describe('Service Status and Health', () => {
    it('should provide cache operations', () => {
      const key = 'test-key';
      const value = { data: 'test' };
      
      service.setCache(key, value);
      expect(service.hasCache(key)).toBe(true);
      expect(service.getCache(key)).toEqual(value);
      
      service.deleteCache(key);
      expect(service.hasCache(key)).toBe(false);
    });

    it('should manage cache stats', () => {
      const stats = service.getCacheStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Lifecycle Management', () => {
    it('should handle module initialization', async () => {
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should handle module destruction', async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });

    it('should manage scheduled jobs', () => {
      const jobName = 'test-job';
      const cronPattern = '0 */5 * * * *'; // Every 5 minutes
      const callback = jest.fn();
      
      service.addScheduledJob(jobName, cronPattern, callback);
      
      const jobNames = service.getScheduledJobNames();
      expect(jobNames).toContain(jobName);
      
      service.removeScheduledJob(jobName);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid streaming operations gracefully', () => {
      const topic = 'error-topic';
      const subscription = service.subscribeToStream(topic);
      
      expect(() => {
        service.publishToStream(topic, { test: 'data' });
      }).not.toThrow();
      
      // Clean up subscription
      subscription.subscribe().unsubscribe();
    });

    it('should handle MQTT publishing errors', async () => {
      await expect(
        service.publishMqttMessage('test/topic', { test: 'data' })
      ).resolves.not.toThrow();
    });
  });

  describe('Configuration-Based Behavior', () => {
    it('should respect feature flags for transports', () => {
      // This test would check that services are only initialized
      // when their corresponding feature flags are enabled
      expect(service).toBeDefined();
    });

    it('should handle transport operations', () => {
      const transportNames = service.getTransportNames();
      expect(Array.isArray(transportNames)).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        service.sendKafkaMessage(`event.${i}`, { id: i })
      );
      
      await expect(Promise.all(operations)).resolves.not.toThrow();
      expect(kafkaService.publishMessage).toHaveBeenCalledTimes(10);
    });

    it('should manage memory efficiently with streaming channels', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create many streaming channels
      for (let i = 0; i < 100; i++) {
        service.createStreamingChannel(`channel-${i}`);
      }
      
      const channels = service.getStreamingChannels();
      expect(channels.length).toBeGreaterThanOrEqual(100);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB for 100 channels)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
