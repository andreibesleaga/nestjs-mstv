import { Module, Global } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { CacheService } from './cache.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { ConsulService } from './consul.service';
import { EmailingService } from './emailing.service';
import { JaegerService } from './jaeger.service';
import { PerformanceInterceptor } from './performance.interceptor';
import { HttpClientService } from './http-client.service';
import { StorageService } from './storage/storage.service';
import { MemoryStorageAdapter } from './storage/adapters/memory.adapter';
import { S3StorageAdapter } from './storage/adapters/s3.adapter';
import { AzureBlobStorageAdapter } from './storage/adapters/azure.adapter';
import { GCSStorageAdapter } from './storage/adapters/gcs.adapter';

@Global()
@Module({
  providers: [
    FeatureFlagsService,
    HttpClientService,
    {
      provide: StorageService,
      useFactory: () => {
        const enabled = process.env.ENABLE_STORAGE === 'true';
        const provider = (process.env.STORAGE_PROVIDER || 'none').toLowerCase();
        let adapter;
        if (enabled) {
          switch (provider) {
            case 'aws':
              adapter = new S3StorageAdapter();
              break;
            case 'azure':
              adapter = new AzureBlobStorageAdapter();
              break;
            case 'gcp':
              adapter = new GCSStorageAdapter();
              break;
            default:
              adapter = new MemoryStorageAdapter();
          }
        } else {
          adapter = new MemoryStorageAdapter();
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new StorageService(adapter as any);
      },
    },
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
    StorageService,
    ...(process.env.ENABLE_REDIS_CACHE === 'true' ? [CacheService] : []),
    ...(process.env.ENABLE_CIRCUIT_BREAKER === 'true' ? [CircuitBreakerService] : []),
    ...(process.env.ENABLE_CONSUL_DISCOVERY === 'true' ? [ConsulService] : []),
    ...(process.env.ENABLE_EMAIL_SERVICE === 'true' ? [EmailingService] : []),
    ...(process.env.ENABLE_JAEGER_TRACING === 'true' ? [JaegerService] : []),
    ...(process.env.ENABLE_PERFORMANCE_MONITORING === 'true' ? [PerformanceInterceptor] : []),
  ],
})
export class CommonModule {}
