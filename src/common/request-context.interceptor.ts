import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestContext, RequestContextStore } from './request-context';
import { randomUUID } from 'crypto';
import { context as otContext, trace as otTrace } from '@opentelemetry/api';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const existingTraceId =
      req.headers['x-trace-id'] || req.headers['x-request-id'] || req.id || undefined;

    // Try to pull OTel trace id if available
    let otelTraceId: string | undefined;
    try {
      const span = otTrace.getSpan(otContext.active());
      otelTraceId = span?.spanContext()?.traceId;
    } catch {
      // OpenTelemetry not initialized or span context unavailable; fall back to other IDs
    }

    const store: RequestContextStore = {
      traceId: String(otelTraceId || existingTraceId || randomUUID()),
      requestId: String(req.id || existingTraceId || randomUUID()),
      method: req.method,
      url: req.url,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      userId: (req.user && (req.user.id || req.user.sub)) as string | number | undefined,
    };

    // propagate ids via response headers for correlation
    res.header('x-trace-id', store.traceId!);
    res.header('x-request-id', store.requestId!);

    return new Observable((subscriber) => {
      RequestContext.runWith(store, () => {
        next
          .handle()
          .pipe(
            tap({
              error: () => {
                // no-op
              },
            })
          )
          .subscribe(subscriber);
      });
    });
  }
}
