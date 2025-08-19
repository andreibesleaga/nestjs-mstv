import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt?: Date;
  createdAt: Date;
  hits: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: {
    entries: number;
    estimatedBytes: number;
  };
}

@Injectable()
export class CacheManager {
  private readonly logger = new Logger(CacheManager.name);
  private cache: Map<string, CacheEntry> = new Map();
  private isEnabled = false;
  private defaultTtl = 0; // 0 means no expiration
  private maxEntries = 1000;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(private readonly configService: ConfigService) {}

  async initialize(): Promise<void> {
    this.isEnabled = this.configService.get<boolean>('ENABLE_CACHE', true);
    this.defaultTtl = this.configService.get<number>('CACHE_DEFAULT_TTL', 3600) * 1000; // Convert to ms
    this.maxEntries = this.configService.get<number>('CACHE_MAX_ENTRIES', 1000);
    
    if (!this.isEnabled) {
      this.logger.log('Cache is disabled by configuration');
      return;
    }

    // Start cleanup interval
    this.startCleanupInterval();
    
    this.logger.log(`Cache initialized with TTL: ${this.defaultTtl}ms, Max entries: ${this.maxEntries}`);
  }

  async destroy(): Promise<void> {
    this.cache.clear();
    this.logger.log('Cache manager destroyed');
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (!this.isEnabled) {
      return;
    }

    // Enforce max entries limit
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictOldest();
    }

    const expiresAt = ttlMs || this.defaultTtl 
      ? new Date(Date.now() + (ttlMs || this.defaultTtl))
      : undefined;

    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: new Date(),
      hits: 0,
    });

    this.logger.debug(`Cache set: ${key} (expires: ${expiresAt?.toISOString() || 'never'})`);
  }

  get<T>(key: string): T | undefined {
    if (!this.isEnabled) {
      return undefined;
    }

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.logger.debug(`Cache miss: ${key}`);
      return undefined;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.stats.misses++;
      this.logger.debug(`Cache expired: ${key}`);
      return undefined;
    }

    // Update hit count
    entry.hits++;
    this.stats.hits++;
    this.logger.debug(`Cache hit: ${key} (hits: ${entry.hits})`);
    
    return entry.value as T;
  }

  has(key: string): boolean {
    if (!this.isEnabled) {
      return false;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    if (!this.isEnabled) {
      return false;
    }

    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  clear(): void {
    if (!this.isEnabled) {
      return;
    }

    const size = this.cache.size;
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.logger.log(`Cache cleared: ${size} entries removed`);
  }

  keys(): string[] {
    if (!this.isEnabled) {
      return [];
    }

    return Array.from(this.cache.keys());
  }

  size(): number {
    return this.isEnabled ? this.cache.size : 0;
  }

  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T> | T, 
    ttlMs?: number
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = this.get<T>(key);
      if (cached !== undefined) {
        return cached;
      }

      // Not in cache, create value
      const value = await factory();
      this.set(key, value, ttlMs);
      return value;
    } catch (error) {
      throw error;
    }
  }

  mget<T>(keys: string[]): Map<string, T> {
    const result = new Map<string, T>();
    
    for (const key of keys) {
      const value = this.get<T>(key);
      if (value !== undefined) {
        result.set(key, value);
      }
    }
    
    return result;
  }

  mset<T>(entries: Array<{ key: string; value: T; ttlMs?: number }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.value, entry.ttlMs);
    }
  }

  mdelete(keys: string[]): number {
    let deleted = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        deleted++;
      }
    }
    return deleted;
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: {
        entries: this.cache.size,
        estimatedBytes: this.estimateMemoryUsage(),
      },
    };
  }

  getEntry(key: string): CacheEntry | undefined {
    return this.cache.get(key);
  }

  expire(key: string, ttlMs: number): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      entry.expiresAt = new Date(Date.now() + ttlMs);
      return true;
    }
    return false;
  }

  ttl(key: string): number {
    const entry = this.cache.get(key);
    if (!entry || !entry.expiresAt) {
      return -1; // No expiration
    }
    
    const ttl = entry.expiresAt.getTime() - Date.now();
    return ttl > 0 ? ttl : 0;
  }

  private evictOldest(): void {
    if (this.cache.size === 0) {
      return;
    }

    // Find oldest entry by creation time
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt.getTime() < oldestTime) {
        oldestTime = entry.createdAt.getTime();
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug(`Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  private cleanupExpired(): void {
    const now = new Date();
    const expired: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        expired.push(key);
      }
    }
    
    for (const key of expired) {
      this.cache.delete(key);
    }
    
    if (expired.length > 0) {
      this.logger.debug(`Cleaned up ${expired.length} expired cache entries`);
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Cleanup every minute
  }

  private estimateMemoryUsage(): number {
    let estimatedBytes = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation: key length + value size (approximated)
      estimatedBytes += key.length * 2; // UTF-16 encoding
      estimatedBytes += JSON.stringify(entry.value).length * 2;
      estimatedBytes += 100; // Overhead for entry metadata
    }
    
    return estimatedBytes;
  }
}
