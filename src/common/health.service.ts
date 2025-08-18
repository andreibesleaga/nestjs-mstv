import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { MongoDbService } from './mongodb.service';
import { RedisClient } from '../modules/auth/redis.client';
import { DatabaseConfig } from './database.config';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly mongodb?: MongoDbService,
    private readonly redis?: RedisClient
  ) {}

  async checkDatabase(): Promise<{ status: string; responseTime: number }> {
    const start = Date.now();
    try {
      if ((DatabaseConfig.isPostgreSQL() || DatabaseConfig.isMySQL()) && this.prisma) {
        await this.prisma.$queryRaw`SELECT 1`;
      } else if (DatabaseConfig.isMongoDb() && this.mongodb) {
        await this.mongodb.getDb().command({ ping: 1 });
      } else if (process.env.MONGODB_URL && this.mongodb) {
        await this.mongodb.getDb().command({ ping: 1 });
      } else if (this.prisma) {
        // Fallback to Prisma if available
        await this.prisma.$queryRaw`SELECT 1`;
      } else {
        // No database service available
        this.logger.warn('No database service available for health check');
        return { status: 'unknown', responseTime: Date.now() - start };
      }

      return { status: 'healthy', responseTime: Date.now() - start };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return { status: 'unhealthy', responseTime: Date.now() - start };
    }
  }

  async checkRedis(): Promise<{ status: string; responseTime: number }> {
    const start = Date.now();
    try {
      if (!this.redis) {
        this.logger.warn('Redis service not available for health check');
        return { status: 'unknown', responseTime: Date.now() - start };
      }

      await this.redis.set('health-check', 'ok', 5);
      await this.redis.get('health-check');
      return { status: 'healthy', responseTime: Date.now() - start };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return { status: 'unhealthy', responseTime: Date.now() - start };
    }
  }

  async getDetailedHealth() {
    try {
      const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);

      const overall =
        database.status === 'healthy' && (redis.status === 'healthy' || redis.status === 'unknown')
          ? 'healthy'
          : database.status === 'unknown' && redis.status === 'unknown'
            ? 'unknown'
            : 'unhealthy';

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
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        error: 'Health check failed',
      };
    }
  }
}
