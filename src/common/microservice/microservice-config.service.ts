import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TransportConfig {
  enabled: boolean;
  options: any;
}

export interface ScheduleConfig {
  enabled: boolean;
  cronExpression: string;
  description: string;
}

@Injectable()
export class MicroserviceConfigService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * TCP Transport Configuration
   */
  getTcpConfig(): TransportConfig {
    return {
      enabled: this.configService.get<boolean>('ENABLE_TCP_MICROSERVICE', false),
      options: {
        host: this.configService.get<string>('TCP_HOST', 'localhost'),
        port: this.configService.get<number>('TCP_PORT', 3001),
        retryAttempts: this.configService.get<number>('TCP_RETRY_ATTEMPTS', 5),
        retryDelay: this.configService.get<number>('TCP_RETRY_DELAY', 3000),
      }
    };
  }

  /**
   * Redis Transport Configuration
   */
  getRedisConfig(): TransportConfig {
    return {
      enabled: this.configService.get<boolean>('ENABLE_REDIS_MICROSERVICE', false),
      options: {
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
        retryAttempts: this.configService.get<number>('REDIS_RETRY_ATTEMPTS', 5),
        retryDelay: this.configService.get<number>('REDIS_RETRY_DELAY', 3000),
      }
    };
  }

  /**
   * NATS Transport Configuration
   */
  getNatsConfig(): TransportConfig {
    const servers = this.configService.get<string>('NATS_SERVERS', 'nats://localhost:4222');
    return {
      enabled: this.configService.get<boolean>('ENABLE_NATS_MICROSERVICE', false),
      options: {
        servers: Array.isArray(servers) ? servers : [servers],
        user: this.configService.get<string>('NATS_USER'),
        pass: this.configService.get<string>('NATS_PASS'),
        token: this.configService.get<string>('NATS_TOKEN'),
        retryAttempts: this.configService.get<number>('NATS_RETRY_ATTEMPTS', 5),
        retryDelay: this.configService.get<number>('NATS_RETRY_DELAY', 3000),
      }
    };
  }

  /**
   * RabbitMQ Transport Configuration
   */
  getRabbitMqConfig(): TransportConfig {
    return {
      enabled: this.configService.get<boolean>('ENABLE_RABBITMQ_MICROSERVICE', false),
      options: {
        urls: [this.configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672')],
        queue: this.configService.get<string>('RABBITMQ_QUEUE', 'nestjs_queue'),
        queueOptions: {
          durable: this.configService.get<boolean>('RABBITMQ_DURABLE', true),
          exclusive: this.configService.get<boolean>('RABBITMQ_EXCLUSIVE', false),
          autoDelete: this.configService.get<boolean>('RABBITMQ_AUTO_DELETE', false),
        },
        socketOptions: {
          heartbeatIntervalInSeconds: this.configService.get<number>('RABBITMQ_HEARTBEAT', 60),
          reconnectTimeInSeconds: this.configService.get<number>('RABBITMQ_RECONNECT', 5),
        },
        retryAttempts: this.configService.get<number>('RABBITMQ_RETRY_ATTEMPTS', 5),
        retryDelay: this.configService.get<number>('RABBITMQ_RETRY_DELAY', 3000),
      }
    };
  }

  /**
   * gRPC Transport Configuration
   */
  getGrpcConfig(): TransportConfig {
    return {
      enabled: this.configService.get<boolean>('ENABLE_GRPC', false),
      options: {
        package: this.configService.get<string>('GRPC_PACKAGE', 'nestjs'),
        protoPath: this.configService.get<string>('GRPC_PROTO_PATH', './src/schemas/user.proto'),
        url: `${this.configService.get<string>('GRPC_HOST', 'localhost')}:${this.configService.get<number>('GRPC_PORT', 5000)}`,
        maxSendMessageLength: this.configService.get<number>('GRPC_MAX_SEND_MESSAGE_LENGTH', 4 * 1024 * 1024),
        maxReceiveMessageLength: this.configService.get<number>('GRPC_MAX_RECEIVE_MESSAGE_LENGTH', 4 * 1024 * 1024),
        retryAttempts: this.configService.get<number>('GRPC_RETRY_ATTEMPTS', 5),
        retryDelay: this.configService.get<number>('GRPC_RETRY_DELAY', 3000),
      }
    };
  }

  /**
   * Kafka Configuration (using existing KafkaService)
   */
  getKafkaConfig() {
    return {
      enabled: this.configService.get<boolean>('ENABLE_KAFKA', true),
      brokers: this.configService.get<string>('KAFKA_BROKERS', 'localhost:9092').split(','),
      clientId: this.configService.get<string>('KAFKA_CLIENT_ID', 'nestjs-microservice'),
      groupId: this.configService.get<string>('KAFKA_GROUP_ID', 'nestjs-group'),
    };
  }

  /**
   * BullMQ Configuration (using existing BullMQService)
   */
  getBullMqConfig() {
    return {
      enabled: this.configService.get<boolean>('ENABLE_BULLMQ', true),
      redis: {
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
      },
      defaultJobOptions: {
        removeOnComplete: this.configService.get<number>('BULLMQ_REMOVE_ON_COMPLETE', 10),
        removeOnFail: this.configService.get<number>('BULLMQ_REMOVE_ON_FAIL', 5),
        attempts: this.configService.get<number>('BULLMQ_ATTEMPTS', 3),
        backoff: {
          type: 'exponential',
          delay: this.configService.get<number>('BULLMQ_BACKOFF_DELAY', 2000),
        },
      },
    };
  }

  /**
   * MQTT Configuration (using existing MqttService)
   */
  getMqttConfig() {
    return {
      enabled: this.configService.get<boolean>('ENABLE_MQTT', false),
      brokerUrl: this.configService.get<string>('MQTT_BROKER_URL', 'mqtt://localhost:1883'),
      options: {
        clientId: this.configService.get<string>('MQTT_CLIENT_ID', 'nestjs-microservice'),
        username: this.configService.get<string>('MQTT_USERNAME'),
        password: this.configService.get<string>('MQTT_PASSWORD'),
        keepalive: this.configService.get<number>('MQTT_KEEPALIVE', 60),
        reconnectPeriod: this.configService.get<number>('MQTT_RECONNECT_PERIOD', 1000),
        connectTimeout: this.configService.get<number>('MQTT_CONNECT_TIMEOUT', 30 * 1000),
      },
    };
  }

  /**
   * Streaming Configuration
   */
  getStreamingConfig() {
    return {
      enabled: this.configService.get<boolean>('ENABLE_STREAMING', true),
      channels: this.configService.get<string>('STREAMING_CHANNELS', 'user-events,system-metrics,audit-logs,notifications,real-time-data').split(','),
      bufferSize: this.configService.get<number>('STREAMING_BUFFER_SIZE', 1000),
      timeout: this.configService.get<number>('STREAMING_TIMEOUT', 30000),
    };
  }

  /**
   * Scheduler Configuration
   */
  getSchedulerConfig(): { [key: string]: ScheduleConfig } {
    return {
      'health-check': {
        enabled: this.configService.get<boolean>('ENABLE_HEALTH_CHECK_CRON', true),
        cronExpression: this.configService.get<string>('HEALTH_CHECK_CRON', '*/30 * * * *'),
        description: 'Health check for all microservice transports',
      },
      'metrics-collection': {
        enabled: this.configService.get<boolean>('ENABLE_METRICS_COLLECTION_CRON', false),
        cronExpression: this.configService.get<string>('METRICS_COLLECTION_CRON', '*/5 * * * *'),
        description: 'Collect and report system metrics',
      },
      'cleanup': {
        enabled: this.configService.get<boolean>('ENABLE_CLEANUP_CRON', false),
        cronExpression: this.configService.get<string>('CLEANUP_CRON', '0 2 * * *'),
        description: 'Daily cleanup of temporary resources',
      },
      'data-sync': {
        enabled: this.configService.get<boolean>('ENABLE_DATA_SYNC_CRON', false),
        cronExpression: this.configService.get<string>('DATA_SYNC_CRON', '0 */6 * * *'),
        description: 'Periodic data synchronization between services',
      },
      'backup': {
        enabled: this.configService.get<boolean>('ENABLE_BACKUP_CRON', false),
        cronExpression: this.configService.get<string>('BACKUP_CRON', '0 1 * * *'),
        description: 'Daily backup operations',
      },
    };
  }

  /**
   * Circuit Breaker Configuration for Microservices
   */
  getCircuitBreakerConfig() {
    return {
      enabled: this.configService.get<boolean>('ENABLE_CIRCUIT_BREAKER', false),
      threshold: this.configService.get<number>('CB_THRESHOLD', 5),
      timeout: this.configService.get<number>('CB_TIMEOUT', 10000),
      resetTimeout: this.configService.get<number>('CB_RESET_TIMEOUT', 60000),
      errorThresholdPercentage: this.configService.get<number>('CB_ERROR_THRESHOLD_PERCENTAGE', 50),
      volumeThreshold: this.configService.get<number>('CB_VOLUME_THRESHOLD', 10),
    };
  }

  /**
   * Retry Configuration
   */
  getRetryConfig() {
    return {
      enabled: this.configService.get<boolean>('ENABLE_RETRY', true),
      attempts: this.configService.get<number>('RETRY_ATTEMPTS', 3),
      delay: this.configService.get<number>('RETRY_DELAY', 1000),
      maxDelay: this.configService.get<number>('RETRY_MAX_DELAY', 10000),
      exponentialBackoff: this.configService.get<boolean>('RETRY_EXPONENTIAL_BACKOFF', true),
    };
  }

  /**
   * Timeout Configuration
   */
  getTimeoutConfig() {
    return {
      default: this.configService.get<number>('DEFAULT_TIMEOUT', 5000),
      tcp: this.configService.get<number>('TCP_TIMEOUT', 5000),
      redis: this.configService.get<number>('REDIS_TIMEOUT', 5000),
      nats: this.configService.get<number>('NATS_TIMEOUT', 5000),
      rabbitmq: this.configService.get<number>('RABBITMQ_TIMEOUT', 5000),
      grpc: this.configService.get<number>('GRPC_TIMEOUT', 5000),
      kafka: this.configService.get<number>('KAFKA_TIMEOUT', 5000),
      mqtt: this.configService.get<number>('MQTT_TIMEOUT', 5000),
    };
  }

  /**
   * Health Check Configuration
   */
  getHealthCheckConfig() {
    return {
      enabled: this.configService.get<boolean>('ENABLE_HEALTH_CHECK', true),
      interval: this.configService.get<number>('HEALTH_CHECK_INTERVAL', 30000),
      timeout: this.configService.get<number>('HEALTH_CHECK_TIMEOUT', 5000),
      retries: this.configService.get<number>('HEALTH_CHECK_RETRIES', 3),
    };
  }

  /**
   * Monitoring Configuration
   */
  getMonitoringConfig() {
    return {
      enabled: this.configService.get<boolean>('ENABLE_MONITORING', true),
      metricsInterval: this.configService.get<number>('METRICS_INTERVAL', 60000),
      logLevel: this.configService.get<string>('LOG_LEVEL', 'info'),
      enableTracing: this.configService.get<boolean>('ENABLE_TRACING', false),
      enableProfiling: this.configService.get<boolean>('ENABLE_PROFILING', false),
    };
  }
}
