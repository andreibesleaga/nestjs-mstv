import { Injectable, Optional } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';

export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeoutMs?: number;
  cbName?: string; // circuit name override
}

@Injectable()
export class HttpClientService {
  constructor(@Optional() private readonly cb?: CircuitBreakerService) {}

  async fetch<T = any>(url: string, options: HttpRequestOptions = {}): Promise<T> {
    const method = options.method || 'GET';
    const headers = options.headers || {};
    const body = options.body ? JSON.stringify(options.body) : undefined;
    const timeoutMs = options.timeoutMs ?? 10000;
    const cbName = options.cbName || `http:${method}:${new URL(url).host}`;

    const exec = async () => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method,
          headers: { 'content-type': 'application/json', ...headers },
          body,
          signal: controller.signal,
        } as any);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return (await res.json()) as T;
        }
        return (await res.text()) as unknown as T;
      } finally {
        clearTimeout(id);
      }
    };

    if (this.cb && process.env.ENABLE_CIRCUIT_BREAKER === 'true') {
      return this.cb.execute(cbName, exec, {
        failureThreshold: parseInt(process.env.CB_THRESHOLD || '5', 10),
        resetTimeout: parseInt(process.env.CB_RESET_TIMEOUT || '60000', 10),
        monitoringPeriod: parseInt(process.env.CB_TIMEOUT || '10000', 10),
      });
    }
    return exec();
  }
}
