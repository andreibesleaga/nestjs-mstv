import { Injectable, Logger } from '@nestjs/common';
import { RedisClient } from '../../modules/auth/redis.client';
import { FeatureFlagsService } from './feature-flags.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private isEnabled = false;

  constructor(
    private readonly redis: RedisClient,
    private readonly featureFlags: FeatureFlagsService
  ) {
    this.isEnabled = this.featureFlags.isRedisCacheEnabled;
    if (!this.isEnabled) {
      this.logger.log('Redis cache is disabled by feature flag');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled) return null;

    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error.message);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await this.redis.set(key, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error.message);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error.message);
    }
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    if (!this.isEnabled) {
      // If cache is disabled, always execute the factory function
      return await factory();
    }

    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
