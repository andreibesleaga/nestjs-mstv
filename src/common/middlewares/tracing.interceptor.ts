import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { JaegerService } from '../services/jaeger.service';
import { RequestContext } from './request-context';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(private readonly jaegerService: JaegerService) {}

  intercept(context: ExecutionContext, next: CallHandler): any {
    const request = context.switchToHttp().getRequest();
    const operationName = `${request.method} ${request.url}`;

    const span = this.jaegerService.startSpan(operationName);

    if (span) {
      span.setTag('http.method', request.method);
      span.setTag('http.url', request.url);
      span.setTag('user.agent', request.headers['user-agent']);
      try {
        const traceId = span.context()?.traceIdStr || span.context()?.toTraceId?.();
        const store = RequestContext.getStore();
        if (traceId && store) {
          store.traceId = traceId;
        }
      } catch {
        // Failed to read or propagate trace id; continue without updating RequestContext
      }
    }

    const result = next.handle();

    // Finish span after request completes
    setTimeout(() => {
      if (span) {
        this.jaegerService.finishSpan(span, { 'http.status_code': 200 });
      }
    }, 0);

    return result;
  }
}
