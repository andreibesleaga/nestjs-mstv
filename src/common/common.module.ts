import { Module, Global } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { CacheService } from './cache.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { ConsulService } from './consul.service';
import { EmailingService } from './emailing.service';
import { JaegerService } from './jaeger.service';
import { PerformanceInterceptor } from './performance.interceptor';
import { HttpClientService } from './http-client.service';

@Global()
@Module({
  providers: [
    FeatureFlagsService,
    HttpClientService,
    ...(process.env.ENABLE_REDIS_CACHE === 'true' ? [CacheService] : []),
    ...(process.env.ENABLE_CIRCUIT_BREAKER === 'true' ? [CircuitBreakerService] : []),
    ...(process.env.ENABLE_CONSUL_DISCOVERY === 'true' ? [ConsulService] : []),
    ...(process.env.ENABLE_EMAIL_SERVICE === 'true' ? [EmailingService] : []),
    ...(process.env.ENABLE_JAEGER_TRACING === 'true' ? [JaegerService] : []),
    ...(process.env.ENABLE_PERFORMANCE_MONITORING === 'true' ? [PerformanceInterceptor] : []),
  ],
  exports: [
    FeatureFlagsService,
    HttpClientService,
    ...(process.env.ENABLE_REDIS_CACHE === 'true' ? [CacheService] : []),
    ...(process.env.ENABLE_CIRCUIT_BREAKER === 'true' ? [CircuitBreakerService] : []),
    ...(process.env.ENABLE_CONSUL_DISCOVERY === 'true' ? [ConsulService] : []),
    ...(process.env.ENABLE_EMAIL_SERVICE === 'true' ? [EmailingService] : []),
    ...(process.env.ENABLE_JAEGER_TRACING === 'true' ? [JaegerService] : []),
    ...(process.env.ENABLE_PERFORMANCE_MONITORING === 'true' ? [PerformanceInterceptor] : []),
  ],
})
export class CommonModule {}
