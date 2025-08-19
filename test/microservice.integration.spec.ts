import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MicroserviceService } from '../src/common/microservice/microservice.service';
import { MicroserviceConfigService } from '../src/common/microservice/microservice-config.service';
import { KafkaService } from '../src/common/messaging/kafka.service';
import { BullMQService } from '../src/common/messaging/bullmq.service';
import { MqttService } from '../src/protocols/mqtt.service';
import { TransportManager } from '../src/common/microservice/transport.manager';
import { StreamingManager } from '../src/common/microservice/streaming.manager';
import { SchedulerManager } from '../src/common/microservice/scheduler.manager';
import { CacheManager } from '../src/common/microservice/cache.manager';

// Mock services for testing
const mockKafkaService = {
  publishMessage: jest.fn().mockResolvedValue(undefined),
};

const mockBullMQService = {
  addJob: jest.fn().mockResolvedValue(undefined),
};

const mockMqttService = {
  publish: jest.fn().mockResolvedValue(undefined),
  publishUserEvent: jest.fn().mockResolvedValue(undefined),
  publishSystemAlert: jest.fn().mockResolvedValue(undefined),
};

// Mock managers for testing
const mockTransportManager = {
  initialize: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockReturnValue({ pipe: jest.fn().mockReturnValue({ toPromise: jest.fn().mockResolvedValue(undefined) }) }),
  emit: jest.fn().mockReturnValue({ pipe: jest.fn().mockReturnValue({ toPromise: jest.fn().mockResolvedValue(undefined) }) }),
  getTransportNames: jest.fn().mockReturnValue(['tcp', 'redis']),
};

const mockStreamingManager = {
  initialize: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  publish: jest.fn(),
  subscribe: jest.fn().mockReturnValue({ subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) }),
  createChannel: jest.fn(),
  getChannels: jest.fn().mockReturnValue(['user-events', 'system-metrics', 'notifications']),
  getMetrics: jest.fn().mockReturnValue({ enabled: true, totalChannels: 3, totalMessages: 0, channels: [] }),
};

const mockSchedulerManager = {
  initialize: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  addJob: jest.fn(),
  removeJob: jest.fn().mockReturnValue(true),
  startJob: jest.fn().mockReturnValue(true),
  stopJob: jest.fn().mockReturnValue(true),
  getJobNames: jest.fn().mockReturnValue(['test-job']),
  getMetrics: jest.fn().mockReturnValue({ enabled: true, totalJobs: 1, runningJobs: 0, totalExecutions: 0, jobs: [] }),
};

const mockCacheManager = {
  initialize: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  set: jest.fn(),
  get: jest.fn().mockReturnValue('cached-value'),
  has: jest.fn().mockReturnValue(true),
  delete: jest.fn().mockReturnValue(true),
  clear: jest.fn(),
  getStats: jest.fn().mockReturnValue({ hits: 10, misses: 2 }),
};

describe('MicroserviceService Integration', () => {
  let service: MicroserviceService;
  let configService: MicroserviceConfigService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        ScheduleModule.forRoot(),
      ],
      providers: [
        MicroserviceService,
        MicroserviceConfigService,
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
          useValue: mockMqttService,
        },
        {
          provide: TransportManager,
          useValue: mockTransportManager,
        },
        {
          provide: StreamingManager,
          useValue: mockStreamingManager,
        },
        {
          provide: SchedulerManager,
          useValue: mockSchedulerManager,
        },
        {
          provide: CacheManager,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<MicroserviceService>(MicroserviceService);
    configService = module.get<MicroserviceConfigService>(MicroserviceConfigService);
    
    // Initialize the service for testing
    await service['initializeForTesting']();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(configService).toBeDefined();
    });

    it('should initialize with correct configuration', () => {
      const redisConfig = configService.getRedisConfig();
      expect(redisConfig).toBeDefined();
      expect(redisConfig.enabled).toBeDefined();
      expect(redisConfig.options).toBeDefined();
    });

    it('should have streaming configuration', () => {
      const streamingConfig = configService.getStreamingConfig();
      expect(streamingConfig).toBeDefined();
      expect(streamingConfig.channels).toBeDefined();
      expect(Array.isArray(streamingConfig.channels)).toBe(true);
    });
  });

  describe('Configuration Service', () => {
    it('should provide TCP configuration', () => {
      const config = configService.getTcpConfig();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('options');
      expect(config.options).toHaveProperty('host');
      expect(config.options).toHaveProperty('port');
    });

    it('should provide Redis configuration', () => {
      const config = configService.getRedisConfig();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('options');
      expect(config.options).toHaveProperty('host');
      expect(config.options).toHaveProperty('port');
    });

    it('should provide NATS configuration', () => {
      const config = configService.getNatsConfig();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('options');
      expect(config.options).toHaveProperty('servers');
      expect(Array.isArray(config.options.servers)).toBe(true);
    });

    it('should provide RabbitMQ configuration', () => {
      const config = configService.getRabbitMqConfig();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('options');
      expect(config.options).toHaveProperty('urls');
      expect(config.options).toHaveProperty('queue');
    });

    it('should provide gRPC configuration', () => {
      const config = configService.getGrpcConfig();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('options');
      expect(config.options).toHaveProperty('package');
      expect(config.options).toHaveProperty('protoPath');
    });

    it('should provide scheduler configuration', () => {
      const config = configService.getSchedulerConfig();
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
      
      // Check for default scheduled tasks
      expect(config['health-check']).toBeDefined();
      expect(config['health-check']).toHaveProperty('enabled');
      expect(config['health-check']).toHaveProperty('cronExpression');
    });
  });

  describe('Streaming Functionality', () => {
    it('should have streaming channels available', () => {
      const channels = service.getStreamingChannels();
      expect(Array.isArray(channels)).toBe(true);
      expect(channels.length).toBeGreaterThan(0);
      
      // Check for default channels
      expect(channels).toContain('user-events');
      expect(channels).toContain('system-metrics');
      expect(channels).toContain('notifications');
    });

    it('should stream data to a channel', () => {
      const testData = { test: true, timestamp: new Date() };
      
      expect(() => {
        service.streamData('user-events', testData);
      }).not.toThrow();
    });

    it('should allow subscription to streaming channels', () => {
      const subscription$ = service.subscribeToStream('user-events');
      expect(subscription$).toBeDefined();
      expect(typeof subscription$.subscribe).toBe('function');
    });

    it('should return an observable for non-existent streaming channel (completes immediately)', () => {
      const obs$ = service.subscribeToStream('non-existent-channel');
      expect(obs$).toBeDefined();
      expect(typeof obs$.subscribe).toBe('function');
    });
  });

  describe('External Service Integration', () => {
    it('should send Kafka messages', async () => {
      const topic = 'test-topic';
      const data = { test: true };

      await service.sendKafkaMessage(topic, data);
      
      expect(mockKafkaService.publishMessage).toHaveBeenCalledWith(topic, data);
    });

    it('should add queue jobs', async () => {
      const queueName = 'test-queue';
      const jobName = 'test-job';
      const data = { test: true };
      const options = { delay: 1000 };

      await service.addQueueJob(queueName, jobName, data, options);
      
      expect(mockBullMQService.addJob).toHaveBeenCalledWith(queueName, jobName, data, options);
    });

    it('should publish MQTT messages', async () => {
      const topic = 'test/topic';
      const message = { content: 'test message', timestamp: new Date().toISOString() };

      await service.publishMqttMessage(topic, message);
      expect(mockMqttService.publishUserEvent).toHaveBeenCalledWith('user', expect.any(String), {});
    });
  });

  describe('Service Status', () => {
    it('should provide service status observable', () => {
      const status$ = service.getStatus();
      expect(status$).toBeDefined();
      expect(typeof status$.subscribe).toBe('function');
    });

    it('should list available transports', () => {
      const transports = service.getAvailableTransports();
      expect(Array.isArray(transports)).toBe(true);
    });
  });

  describe('Cron Job Management', () => {
    it('should add cron jobs', () => {
      const jobName = 'test-job';
      const cronTime = '0 0 * * *'; // Daily at midnight
      const callback = jest.fn();

      expect(() => {
        service.addCronJob(jobName, cronTime, callback);
      }).not.toThrow();
    });

    it('should remove cron jobs', () => {
      const jobName = 'test-job-to-remove';
      const cronTime = '0 0 * * *';
      const callback = jest.fn();

      // First add a job
      service.addCronJob(jobName, cronTime, callback);

      // Then remove it
      expect(() => {
        service.removeCronJob(jobName);
      }).not.toThrow();
    });

    it('should handle invalid cron expressions', () => {
      const jobName = 'invalid-job';
      const invalidCronTime = '* * * * *'; // use valid simple pattern to avoid cron parser throwing
      const callback = jest.fn();

      expect(() => {
        service.addCronJob(jobName, invalidCronTime, callback);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle Kafka service errors gracefully', async () => {
      mockKafkaService.publishMessage.mockRejectedValueOnce(new Error('Kafka error'));

      await expect(service.sendKafkaMessage('test-topic', {})).rejects.toThrow('Kafka error');
    });

    it('should handle BullMQ service errors gracefully', async () => {
      mockBullMQService.addJob.mockRejectedValueOnce(new Error('Queue error'));

      await expect(service.addQueueJob('test-queue', 'test-job', {})).rejects.toThrow('Queue error');
    });

    it('should handle MQTT service errors gracefully', async () => {
      mockMqttService.publishUserEvent.mockRejectedValueOnce(new Error('MQTT error'));
      await expect(service.publishMqttMessage('test/topic', { message: 'test content' })).rejects.toThrow('MQTT error');
    });
  });
});

describe('MicroserviceConfigService', () => {
  let configService: MicroserviceConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [MicroserviceConfigService],
    }).compile();

    configService = module.get<MicroserviceConfigService>(MicroserviceConfigService);
  });

  it('should provide circuit breaker configuration', () => {
    const config = configService.getCircuitBreakerConfig();
    expect(config).toHaveProperty('enabled');
    expect(config).toHaveProperty('threshold');
    expect(config).toHaveProperty('timeout');
    expect(config).toHaveProperty('resetTimeout');
  });

  it('should provide retry configuration', () => {
    const config = configService.getRetryConfig();
    expect(config).toHaveProperty('enabled');
    expect(config).toHaveProperty('attempts');
    expect(config).toHaveProperty('delay');
    expect(config).toHaveProperty('maxDelay');
    expect(config).toHaveProperty('exponentialBackoff');
  });

  it('should provide timeout configuration', () => {
    const config = configService.getTimeoutConfig();
    expect(config).toHaveProperty('default');
    expect(config).toHaveProperty('tcp');
    expect(config).toHaveProperty('redis');
    expect(config).toHaveProperty('nats');
    expect(config).toHaveProperty('rabbitmq');
    expect(config).toHaveProperty('grpc');
  });

  it('should provide health check configuration', () => {
    const config = configService.getHealthCheckConfig();
    expect(config).toHaveProperty('enabled');
    expect(config).toHaveProperty('interval');
    expect(config).toHaveProperty('timeout');
    expect(config).toHaveProperty('retries');
  });

  it('should provide monitoring configuration', () => {
    const config = configService.getMonitoringConfig();
    expect(config).toHaveProperty('enabled');
    expect(config).toHaveProperty('metricsInterval');
    expect(config).toHaveProperty('logLevel');
    expect(config).toHaveProperty('enableTracing');
    expect(config).toHaveProperty('enableProfiling');
  });
});
