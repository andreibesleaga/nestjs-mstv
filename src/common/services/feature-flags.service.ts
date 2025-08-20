import { Injectable } from '@nestjs/common';
import { SimplifiedEnvironmentSchema } from '../types/validation.schemas';

@Injectable()
export class FeatureFlagsService {
  private readonly config = SimplifiedEnvironmentSchema.parse(process.env);

  // Protocol Feature Flags
  get isWebSocketEnabled(): boolean {
    return this.config.ENABLE_WEBSOCKET;
  }

  get isMqttEnabled(): boolean {
    return this.config.ENABLE_MQTT;
  }

  get isHttpsEnabled(): boolean {
    return this.config.ENABLE_HTTPS;
  }

  get isGrpcEnabled(): boolean {
    return this.config.ENABLE_GRPC;
  }

  // Microservice Transport Feature Flags
  get isTcpMicroserviceEnabled(): boolean {
    return this.config.ENABLE_TCP_MICROSERVICE;
  }

  get isRedisMicroserviceEnabled(): boolean {
    return this.config.ENABLE_REDIS_MICROSERVICE;
  }

  get isNatsMicroserviceEnabled(): boolean {
    return this.config.ENABLE_NATS_MICROSERVICE;
  }

  get isRabbitMqMicroserviceEnabled(): boolean {
    return this.config.ENABLE_RABBITMQ_MICROSERVICE;
  }

  // Service Feature Flags
  get isJaegerTracingEnabled(): boolean {
    return this.config.ENABLE_JAEGER_TRACING;
  }

  get isRedisCacheEnabled(): boolean {
    return this.config.ENABLE_REDIS_CACHE;
  }

  get isConsulDiscoveryEnabled(): boolean {
    return this.config.ENABLE_CONSUL_DISCOVERY;
  }

  get isCircuitBreakerEnabled(): boolean {
    return this.config.ENABLE_CIRCUIT_BREAKER;
  }

  get isPerformanceMonitoringEnabled(): boolean {
    return this.config.ENABLE_PERFORMANCE_METRICS;
  }

  get isEmailServiceEnabled(): boolean {
    return this.config.ENABLE_EMAIL_SERVICE;
  }

  // Observability
  get isOpenTelemetryEnabled(): boolean {
    return this.config.ENABLE_DISTRIBUTED_TRACING;
  }

  // Messaging and Queue systems
  get isKafkaEnabled(): boolean {
    return this.config.ENABLE_KAFKA;
  }

  get isBullMqEnabled(): boolean {
    return this.config.ENABLE_BULLMQ;
  }

  get isStreamingEnabled(): boolean {
    return this.config.ENABLE_STREAMING;
  }

  // Utility methods
  isProtocolEnabled(protocol: 'websocket' | 'mqtt' | 'https' | 'grpc'): boolean {
    switch (protocol) {
      case 'websocket':
        return this.isWebSocketEnabled;
      case 'mqtt':
        return this.isMqttEnabled;
      case 'https':
        return this.isHttpsEnabled;
      case 'grpc':
        return this.isGrpcEnabled;
      default:
        return false;
    }
  }

  isServiceEnabled(
    service: 'jaeger' | 'redis' | 'consul' | 'circuit-breaker' | 'performance' | 'email'
  ): boolean {
    switch (service) {
      case 'jaeger':
        return this.isJaegerTracingEnabled;
      case 'redis':
        return this.isRedisCacheEnabled;
      case 'consul':
        return this.isConsulDiscoveryEnabled;
      case 'circuit-breaker':
        return this.isCircuitBreakerEnabled;
      case 'performance':
        return this.isPerformanceMonitoringEnabled;
      case 'email':
        return this.isEmailServiceEnabled;
      default:
        return false;
    }
  }
}
