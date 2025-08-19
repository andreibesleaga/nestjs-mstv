import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MicroserviceConfig } from '../config/microservice.config';
import { FeatureFlagsService } from './feature-flags.service';

// Jaeger types
interface JaegerTracer {
  startSpan(operationName: string, parentSpanContext?: JaegerSpan): JaegerSpan;
  close(): void;
}

interface JaegerSpan {
  setTag(key: string, value: unknown): JaegerSpan;
  setOperationName(name: string): JaegerSpan;
  finish(): void;
  context(): JaegerSpanContext;
}

interface JaegerSpanContext {
  toTraceId(): string;
  toSpanId(): string;
}

// Note: JaegerConfig intentionally omitted to avoid unused type

@Injectable()
export class JaegerService implements OnModuleInit {
  private readonly logger = new Logger(JaegerService.name);
  private tracer: JaegerTracer | null = null;
  private isEnabled = false;

  constructor(
    private readonly config: MicroserviceConfig,
    private readonly featureFlags: FeatureFlagsService
  ) {}

  async onModuleInit() {
    this.isEnabled = this.featureFlags.isJaegerTracingEnabled;

    if (!this.isEnabled) {
      this.logger.log('Jaeger tracing is disabled by feature flag');
      return;
    }

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

  startSpan(operationName: string, parentSpan?: JaegerSpan): JaegerSpan | null {
    if (!this.isEnabled || !this.tracer) {
      this.logger.debug('Jaeger tracing not available - returning null span');
      return null;
    }

    try {
      if (parentSpan) {
        return this.tracer.startSpan(operationName, parentSpan);
      }
      return this.tracer.startSpan(operationName);
    } catch (error) {
      this.logger.error('Failed to start Jaeger span:', error);
      return null;
    }
  }

  finishSpan(span: JaegerSpan | null, tags?: Record<string, unknown>): void {
    if (!span || !this.isEnabled) {
      return;
    }

    try {
      if (tags) {
        Object.entries(tags).forEach(([key, value]) => {
          span.setTag(key, value);
        });
      }
      span.finish();
    } catch (error) {
      this.logger.error('Failed to finish Jaeger span:', error);
    }
  }

  getTracer(): JaegerTracer | null {
    return this.tracer;
  }
}
