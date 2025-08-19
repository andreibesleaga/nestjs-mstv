import { Module, Global } from '@nestjs/common';
import { FeatureFlagsService } from './services/feature-flags.service';
import { CacheService } from './services/cache.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { ConsulService } from './services/consul.service';
import { JaegerService } from './services/jaeger.service';
import { PerformanceInterceptor } from './middlewares/performance.interceptor';
import { HttpClientService } from './services/http-client.service';
import { StorageService } from './storage/storage.service';
import { MemoryStorageAdapter } from './storage/adapters/memory.adapter';
import { S3StorageAdapter } from './storage/adapters/s3.adapter';
import { AzureBlobStorageAdapter } from './storage/adapters/azure.adapter';
import { GCSStorageAdapter } from './storage/adapters/gcs.adapter';
import { ConfigValidationService } from './services/config.validation.service';
import { RedisClient } from '../modules/auth/redis.client';
import { MicroserviceConfig } from './config/microservice.config';

@Global()
@Module({
  providers: [
    FeatureFlagsService,
    HttpClientService,
    RedisClient,
    MicroserviceConfig,
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
  CacheService,
  CircuitBreakerService,
  ConsulService,
  JaegerService,
    PerformanceInterceptor,
    ConfigValidationService,
  ],
  exports: [
    FeatureFlagsService,
    HttpClientService,
    RedisClient,
    MicroserviceConfig,
    StorageService,
    ConfigValidationService,
    CacheService,
    CircuitBreakerService,
    ConsulService,
    JaegerService,
    PerformanceInterceptor,
  ],
})
export class CommonModule {}
