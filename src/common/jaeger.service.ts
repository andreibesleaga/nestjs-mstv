import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MicroserviceConfig } from './microservice.config';

@Injectable()
export class JaegerService implements OnModuleInit {
  private readonly logger = new Logger(JaegerService.name);
  private tracer: any;

  constructor(private readonly config: MicroserviceConfig) {}

  async onModuleInit() {
    if (!process.env.JAEGER_ENDPOINT) {
      this.logger.warn('Jaeger not configured - skipping tracing setup');
      return;
    }

    try {
      const jaeger = require('jaeger-client');
      const jaegerConfig = this.config.getJaegerConfig();

      // Make jaeger initialization more resilient
      const config = {
        serviceName: jaegerConfig.serviceName || 'nestjs-api',
        sampler: {
          type: 'const',
          param: 1,
        },
        reporter: {
          collectorEndpoint: process.env.JAEGER_ENDPOINT,
          logSpans: false,
        },
      };

      this.tracer = jaeger.initTracer(config);
      this.logger.log('Jaeger tracing initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Jaeger:', error.message);
      // Don't let Jaeger failures prevent app startup
    }
  }

  startSpan(operationName: string, parentSpan?: any): any {
    if (!this.tracer) return null;

    try {
      return this.tracer.startSpan(operationName, { childOf: parentSpan });
    } catch (error) {
      this.logger.error('Failed to start span:', error.message);
      return null;
    }
  }

  finishSpan(span: any, tags?: Record<string, any>): void {
    if (!span) return;

    try {
      if (tags) {
        Object.entries(tags).forEach(([key, value]) => {
          span.setTag(key, value);
        });
      }
      span.finish();
    } catch (error) {
      this.logger.error('Failed to finish span:', error.message);
    }
  }

  getTracer(): any {
    return this.tracer;
  }
}
