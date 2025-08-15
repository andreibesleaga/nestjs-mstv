import { Injectable } from '@nestjs/common';
import { validateEnvironment } from './environment.validation';

@Injectable()
export class FeatureFlagsService {
  private readonly config = validateEnvironment();

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
    return this.config.ENABLE_PERFORMANCE_MONITORING;
  }

  get isEmailServiceEnabled(): boolean {
    return this.config.ENABLE_EMAIL_SERVICE;
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
