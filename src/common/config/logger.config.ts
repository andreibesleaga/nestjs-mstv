import { LoggerService } from '@nestjs/common';
import pino from 'pino';
import {
  getTraceId,
  getRequestId,
  getUserId,
  getMethod,
  getUrl,
  getIp,
} from '../middlewares/request-context';

export class CustomLogger implements LoggerService {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
      redact: {
        paths: ['password', 'token', 'authorization', 'cookie'],
        censor: '[REDACTED]',
      },
      serializers: {
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
        err: pino.stdSerializers.err,
      },
      base: {
        service: process.env.SERVICE_NAME || 'nestjs-mstv',
        env: process.env.NODE_ENV || 'development',
      },
      // Include request-scoped context automatically in every log line
      mixin: () => {
        const ctx = {
          traceId: getTraceId(),
          requestId: getRequestId(),
          userId: getUserId(),
          method: getMethod(),
          url: getUrl(),
          ip: getIp(),
        } as Record<string, unknown>;
        // Remove undefined fields to keep logs clean
        Object.keys(ctx).forEach((k) => (ctx[k] === undefined ? delete ctx[k] : undefined));
        return ctx;
      },
    });
  }

  log(message: any, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: any, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: any, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: any, context?: string) {
    this.logger.trace({ context }, message);
  }

  /**
   * Expose underlying pino instance so Fastify can reuse the same logger
   */
  getPino(): pino.Logger {
    return this.logger;
  }
}
