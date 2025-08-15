import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FeatureFlagsService } from './feature-flags.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);
  private isEnabled = false;

  constructor(private readonly featureFlags: FeatureFlagsService) {
    this.isEnabled = this.featureFlags.isPerformanceMonitoringEnabled;
    if (!this.isEnabled) {
      this.logger.log('Performance monitoring is disabled by feature flag');
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.isEnabled) {
      return next.handle();
    }

    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration > 1000) {
          this.logger.warn(`Slow request: ${method} ${url} took ${duration}ms`);
        }
      })
    );
  }
}
