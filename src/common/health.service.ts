import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisClient } from '../packages/auth/src/redis.client';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisClient
  ) {}

  async checkDatabase(): Promise<{ status: string; responseTime: number }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', responseTime: Date.now() - start };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return { status: 'unhealthy', responseTime: Date.now() - start };
    }
  }

  async checkRedis(): Promise<{ status: string; responseTime: number }> {
    const start = Date.now();
    try {
      await this.redis.set('health-check', 'ok', 5);
      await this.redis.get('health-check');
      return { status: 'healthy', responseTime: Date.now() - start };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return { status: 'unhealthy', responseTime: Date.now() - start };
    }
  }

  async getDetailedHealth() {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const overall = database.status === 'healthy' && redis.status === 'healthy' 
      ? 'healthy' : 'unhealthy';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database,
        redis,
      },
    };
  }
}