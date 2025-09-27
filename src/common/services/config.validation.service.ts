import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SimplifiedEnvironmentSchema,
  type SimplifiedEnvironmentConfig,
} from '../types/validation.schemas';

@Injectable()
export class ConfigValidationService {
  private readonly logger = new Logger(ConfigValidationService.name);
  private validatedConfig: SimplifiedEnvironmentConfig | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Validate all environment variables using Zod schema
   */
  validateConfig(): SimplifiedEnvironmentConfig {
    if (this.validatedConfig) {
      return this.validatedConfig;
    }

    try {
      // Get raw environment variables
      const rawConfig = {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        DATABASE_TYPE: process.env.DATABASE_TYPE,
        DATABASE_URL: process.env.DATABASE_URL,
        MONGODB_URL: process.env.MONGODB_URL,
        MYSQL_URL: process.env.MYSQL_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        REDIS_URL: process.env.REDIS_URL,

        // Storage
        ENABLE_STORAGE: process.env.ENABLE_STORAGE,
        STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
        S3_BUCKET: process.env.S3_BUCKET,
        S3_REGION: process.env.S3_REGION,
        S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
        S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
        S3_ENDPOINT: process.env.S3_ENDPOINT,
        S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
        AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,
        AZURE_BLOB_CONNECTION_STRING: process.env.AZURE_BLOB_CONNECTION_STRING,
        AZURE_STORAGE_ACCOUNT: process.env.AZURE_STORAGE_ACCOUNT,
        AZURE_STORAGE_ACCOUNT_KEY: process.env.AZURE_STORAGE_ACCOUNT_KEY,
        AZURE_ACCOUNT_NAME: process.env.AZURE_ACCOUNT_NAME,
        AZURE_ACCOUNT_KEY: process.env.AZURE_ACCOUNT_KEY,
        AZURE_BLOB_CONTAINER: process.env.AZURE_BLOB_CONTAINER,
        GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
        GCS_BUCKET: process.env.GCS_BUCKET,
        GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        GCP_APPLICATION_CREDENTIALS: process.env.GCP_APPLICATION_CREDENTIALS,
        GOOGLE_APPLICATION_CREDENTIALS_JSON: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,

        // Feature Flags - Protocols
        ENABLE_WEBSOCKET: process.env.ENABLE_WEBSOCKET,
        ENABLE_MQTT: process.env.ENABLE_MQTT,
        ENABLE_HTTPS: process.env.ENABLE_HTTPS,
        ENABLE_GRPC: process.env.ENABLE_GRPC,

        // Feature Flags - Services
        ENABLE_JAEGER_TRACING: process.env.ENABLE_JAEGER_TRACING,
        ENABLE_REDIS_CACHE: process.env.ENABLE_REDIS_CACHE,
        ENABLE_CONSUL_DISCOVERY: process.env.ENABLE_CONSUL_DISCOVERY,
        ENABLE_CIRCUIT_BREAKER: process.env.ENABLE_CIRCUIT_BREAKER,
        CB_THRESHOLD: process.env.CB_THRESHOLD,
        CB_TIMEOUT: process.env.CB_TIMEOUT,
        CB_RESET_TIMEOUT: process.env.CB_RESET_TIMEOUT,
        ENABLE_PERFORMANCE_MONITORING: process.env.ENABLE_PERFORMANCE_MONITORING,
        ENABLE_EMAIL_SERVICE: process.env.ENABLE_EMAIL_SERVICE,

        // Database Pooling
        PRISMA_CONNECTION_LIMIT: process.env.PRISMA_CONNECTION_LIMIT,
        PRISMA_POOL_TIMEOUT: process.env.PRISMA_POOL_TIMEOUT,
        MONGODB_MAX_POOL_SIZE: process.env.MONGODB_MAX_POOL_SIZE,
        MONGODB_MIN_POOL_SIZE: process.env.MONGODB_MIN_POOL_SIZE,
        MONGODB_MAX_IDLE_TIME_MS: process.env.MONGODB_MAX_IDLE_TIME_MS,
        MONGODB_WAIT_QUEUE_TIMEOUT_MS: process.env.MONGODB_WAIT_QUEUE_TIMEOUT_MS,

        // Observability
        ENABLE_OPENTELEMETRY: process.env.ENABLE_OPENTELEMETRY,
        SERVICE_NAME: process.env.SERVICE_NAME,
        OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        OTEL_EXPORTER_OTLP_HEADERS: process.env.OTEL_EXPORTER_OTLP_HEADERS,
        OTEL_TRACES_EXPORTER: process.env.OTEL_TRACES_EXPORTER,
        OTEL_METRICS_EXPORTER: process.env.OTEL_METRICS_EXPORTER,
        ENABLE_PROMETHEUS_METRICS: process.env.ENABLE_PROMETHEUS_METRICS,
        PROMETHEUS_HOST: process.env.PROMETHEUS_HOST,
        PROMETHEUS_PORT: process.env.PROMETHEUS_PORT,
        ENABLE_SIGNOZ_TRACING: process.env.ENABLE_SIGNOZ_TRACING,
        SIGNOZ_ENDPOINT: process.env.SIGNOZ_ENDPOINT,
        ENABLE_DATADOG_TRACING: process.env.ENABLE_DATADOG_TRACING,
        DATADOG_OTLP_ENDPOINT: process.env.DATADOG_OTLP_ENDPOINT,

        // Microservice Transports
        ENABLE_TCP_MICROSERVICE: process.env.ENABLE_TCP_MICROSERVICE,
        ENABLE_REDIS_MICROSERVICE: process.env.ENABLE_REDIS_MICROSERVICE,
        ENABLE_NATS_MICROSERVICE: process.env.ENABLE_NATS_MICROSERVICE,
        ENABLE_RABBITMQ_MICROSERVICE: process.env.ENABLE_RABBITMQ_MICROSERVICE,
        ENABLE_KAFKA: process.env.ENABLE_KAFKA,
        ENABLE_BULLMQ: process.env.ENABLE_BULLMQ,
        ENABLE_STREAMING: process.env.ENABLE_STREAMING,

        // Transport Configuration
        TCP_HOST: process.env.TCP_HOST,
        TCP_PORT: process.env.TCP_PORT,
        TCP_RETRY_ATTEMPTS: process.env.TCP_RETRY_ATTEMPTS,
        TCP_RETRY_DELAY: process.env.TCP_RETRY_DELAY,
        TCP_TIMEOUT: process.env.TCP_TIMEOUT,
        NATS_SERVERS: process.env.NATS_SERVERS,
        NATS_USER: process.env.NATS_USER,
        NATS_PASS: process.env.NATS_PASS,
        NATS_TOKEN: process.env.NATS_TOKEN,
        NATS_RETRY_ATTEMPTS: process.env.NATS_RETRY_ATTEMPTS,
        NATS_RETRY_DELAY: process.env.NATS_RETRY_DELAY,
        NATS_TIMEOUT: process.env.NATS_TIMEOUT,
        RABBITMQ_URL: process.env.RABBITMQ_URL,
        RABBITMQ_QUEUE: process.env.RABBITMQ_QUEUE,
        RABBITMQ_DURABLE: process.env.RABBITMQ_DURABLE,
        RABBITMQ_EXCLUSIVE: process.env.RABBITMQ_EXCLUSIVE,
        RABBITMQ_AUTO_DELETE: process.env.RABBITMQ_AUTO_DELETE,
        RABBITMQ_HEARTBEAT: process.env.RABBITMQ_HEARTBEAT,
        RABBITMQ_RECONNECT: process.env.RABBITMQ_RECONNECT,
        RABBITMQ_RETRY_ATTEMPTS: process.env.RABBITMQ_RETRY_ATTEMPTS,
        RABBITMQ_RETRY_DELAY: process.env.RABBITMQ_RETRY_DELAY,
        RABBITMQ_TIMEOUT: process.env.RABBITMQ_TIMEOUT,
        KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID,
        KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID,
        KAFKA_TIMEOUT: process.env.KAFKA_TIMEOUT,
        KAFKA_BROKERS: process.env.KAFKA_BROKERS,
        BULLMQ_REMOVE_ON_COMPLETE: process.env.BULLMQ_REMOVE_ON_COMPLETE,
        BULLMQ_REMOVE_ON_FAIL: process.env.BULLMQ_REMOVE_ON_FAIL,
        BULLMQ_ATTEMPTS: process.env.BULLMQ_ATTEMPTS,
        BULLMQ_BACKOFF_DELAY: process.env.BULLMQ_BACKOFF_DELAY,

        // Streaming Configuration
        STREAMING_CHANNELS: process.env.STREAMING_CHANNELS,
        STREAMING_BUFFER_SIZE: process.env.STREAMING_BUFFER_SIZE,
        STREAMING_TIMEOUT: process.env.STREAMING_TIMEOUT,

        // Scheduler/Cron Configuration
        ENABLE_HEALTH_CHECK_CRON: process.env.ENABLE_HEALTH_CHECK_CRON,
        HEALTH_CHECK_CRON: process.env.HEALTH_CHECK_CRON,
        ENABLE_METRICS_COLLECTION_CRON: process.env.ENABLE_METRICS_COLLECTION_CRON,
        METRICS_COLLECTION_CRON: process.env.METRICS_COLLECTION_CRON,
        ENABLE_CLEANUP_CRON: process.env.ENABLE_CLEANUP_CRON,
        CLEANUP_CRON: process.env.CLEANUP_CRON,
        ENABLE_DATA_SYNC_CRON: process.env.ENABLE_DATA_SYNC_CRON,
        DATA_SYNC_CRON: process.env.DATA_SYNC_CRON,
        ENABLE_BACKUP_CRON: process.env.ENABLE_BACKUP_CRON,
        BACKUP_CRON: process.env.BACKUP_CRON,

        // Retry Configuration
        ENABLE_RETRY: process.env.ENABLE_RETRY,
        RETRY_ATTEMPTS: process.env.RETRY_ATTEMPTS,
        RETRY_DELAY: process.env.RETRY_DELAY,
        RETRY_MAX_DELAY: process.env.RETRY_MAX_DELAY,
        RETRY_EXPONENTIAL_BACKOFF: process.env.RETRY_EXPONENTIAL_BACKOFF,

        // Health Check Configuration
        ENABLE_HEALTH_CHECK: process.env.ENABLE_HEALTH_CHECK,
        HEALTH_CHECK_INTERVAL: process.env.HEALTH_CHECK_INTERVAL,
        HEALTH_CHECK_TIMEOUT: process.env.HEALTH_CHECK_TIMEOUT,
        HEALTH_CHECK_RETRIES: process.env.HEALTH_CHECK_RETRIES,

        // Monitoring Configuration
        ENABLE_MONITORING: process.env.ENABLE_MONITORING,
        METRICS_INTERVAL: process.env.METRICS_INTERVAL,
        ENABLE_TRACING: process.env.ENABLE_TRACING,
        ENABLE_PROFILING: process.env.ENABLE_PROFILING,
        ENABLE_EXTERNAL_METRICS: process.env.ENABLE_EXTERNAL_METRICS,

        // Default Timeouts
        DEFAULT_TIMEOUT: process.env.DEFAULT_TIMEOUT,
        REDIS_TIMEOUT: process.env.REDIS_TIMEOUT,

        // MQTT Protocol
        MQTT_BROKER_URL: process.env.MQTT_BROKER_URL,
        MQTT_USERNAME: process.env.MQTT_USERNAME,
        MQTT_PASSWORD: process.env.MQTT_PASSWORD,

        // WebSocket
        WS_PORT: process.env.WS_PORT,

        // gRPC
        GRPC_PORT: process.env.GRPC_PORT,
        GRPC_PACKAGE: process.env.GRPC_PACKAGE,
        GRPC_PROTO_PATH: process.env.GRPC_PROTO_PATH,
        GRPC_HOST: process.env.GRPC_HOST,
        GRPC_MAX_SEND_MESSAGE_LENGTH: process.env.GRPC_MAX_SEND_MESSAGE_LENGTH,
        GRPC_MAX_RECEIVE_MESSAGE_LENGTH: process.env.GRPC_MAX_RECEIVE_MESSAGE_LENGTH,
        GRPC_RETRY_ATTEMPTS: process.env.GRPC_RETRY_ATTEMPTS,
        GRPC_RETRY_DELAY: process.env.GRPC_RETRY_DELAY,
        GRPC_TIMEOUT: process.env.GRPC_TIMEOUT,

        // HTTPS
        SSL_CERT_PATH: process.env.SSL_CERT_PATH,
        SSL_KEY_PATH: process.env.SSL_KEY_PATH,

        // Security
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
        RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
        RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
        BODY_LIMIT: process.env.BODY_LIMIT,

        // Application
        APP_URL: process.env.APP_URL,
        API_BASE_URL: process.env.API_BASE_URL,
        LOG_LEVEL: process.env.LOG_LEVEL,

        // Service Discovery
        CONSUL_HOST: process.env.CONSUL_HOST,
        CONSUL_PORT: process.env.CONSUL_PORT,
        SERVICE_VERSION: process.env.SERVICE_VERSION,
        SERVICE_HOST: process.env.SERVICE_HOST,

        // Distributed Tracing
        JAEGER_ENDPOINT: process.env.JAEGER_ENDPOINT,

        // Email/SMTP Configuration
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_SECURE: process.env.SMTP_SECURE,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,
        SMTP_FROM: process.env.SMTP_FROM,

        // Access tokens
        ACCESS_TOKEN_EXP: process.env.ACCESS_TOKEN_EXP,
        REFRESH_TOKEN_EXP: process.env.REFRESH_TOKEN_EXP,
      };

      // Validate using Zod schema
      this.validatedConfig = SimplifiedEnvironmentSchema.parse(rawConfig);

      this.logger.log('Environment configuration validated successfully');
      return this.validatedConfig;
    } catch (error) {
      this.logger.error('Environment configuration validation failed:', error);

      if (error instanceof Error && 'errors' in error) {
        const zodErrors = (error as any).errors;
        this.logger.error('Validation errors:', zodErrors);
      }

      throw new Error(`Invalid environment configuration: ${error.message}`);
    }
  }

  /**
   * Get validated configuration value
   */
  get<T extends keyof SimplifiedEnvironmentConfig>(key: T): SimplifiedEnvironmentConfig[T] {
    const config = this.validateConfig();
    return config[key];
  }

  /**
   * Get all validated configuration
   */
  getAll(): SimplifiedEnvironmentConfig {
    return this.validateConfig();
  }
}
