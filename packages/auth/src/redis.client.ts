
import IORedis from 'ioredis';
export const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export class RedisClient {
  async set(key: string, value: string, ttlSec?: number) {
    if (ttlSec) return redis.set(key, value, 'EX', ttlSec);
    return redis.set(key, value);
  }
  async get(key: string) { return redis.get(key); }
  async del(key: string) { return redis.del(key); }
}
