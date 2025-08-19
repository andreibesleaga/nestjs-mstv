import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Optionally allow overriding Prisma DB URL at runtime.
    // Pool sizing for Prisma is typically managed by an external pooler (PgBouncer).
    // You can point DATABASE_URL to a PgBouncer endpoint and control pool size there.
    const dbType = (process.env.DATABASE_TYPE || 'postgresql').toLowerCase();
    const effectiveUrl =
      process.env.DATABASE_URL ||
      ((dbType === 'mysql' || dbType === 'mariadb') && process.env.MYSQL_URL
        ? process.env.MYSQL_URL
        : undefined);

    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      datasources: effectiveUrl
        ? {
            db: {
              url: effectiveUrl,
            },
          }
        : undefined,
    });
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      this.logger.warn('Prisma disabled in test environment');
      return;
    }

    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error.message);
      // Don't throw in production - allow app to start without database
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn('Database unavailable - continuing without database');
      }
    }
  }

  async onModuleDestroy() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    try {
      await this.$disconnect();
      this.logger.log('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Failed to disconnect from database:', error.message);
    }
  }
}
