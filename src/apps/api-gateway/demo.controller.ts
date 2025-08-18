import { Controller, Get, Inject, Query } from '@nestjs/common';
import { HttpClientService } from '../../common/http-client.service';

// Simple in-memory counters for flaky upstream simulation
const counters = new Map<string, number>();

@Controller('demo')
export class DemoController {
  constructor(@Inject(HttpClientService) private readonly http: HttpClientService) {}

  // Simulated flaky upstream: fails N times, then succeeds
  @Get('flaky')
  async flaky(@Query('name') name = 'upstream', @Query('fail') fail = '3') {
    const key = `flaky:${name}`;
    const failCount = Number(fail) || 0;
    const remaining = counters.get(key) ?? failCount;
    if (remaining > 0) {
      counters.set(key, remaining - 1);
      throw new Error('Simulated failure');
    }
    return { ok: true, name, remainingFailures: 0 };
  }

  // Outbound call protected by circuit breaker
  @Get('outbound')
  async outbound(
    @Query('name') name = 'upstream',
    @Query('fail') fail = '3',
    @Query('timeoutMs') timeoutMs = '1500'
  ) {
    const port = process.env.PORT || '3000';
    const url = `http://127.0.0.1:${port}/demo/flaky?name=${encodeURIComponent(name)}&fail=${encodeURIComponent(
      fail
    )}`;
    try {
      const data = await this.http.fetch(url, {
        timeoutMs: Number(timeoutMs) || 1500,
        cbName: `demo:${name}`,
      });
      return { ok: true, via: 'circuit', url, data };
    } catch (err: any) {
      return { ok: false, via: 'circuit', url, error: err?.message || String(err) };
    }
  }
}
