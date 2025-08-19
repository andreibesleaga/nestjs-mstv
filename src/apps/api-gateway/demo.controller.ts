import { Controller, Get, Inject, Query, Post, Req, Res } from '@nestjs/common';
import { HttpClientService } from '../../common/services/http-client.service';
import { StorageService } from '../../common/storage/storage.service';
import { createGzip, createGunzip } from 'zlib';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Simple in-memory counters for flaky upstream simulation
const counters = new Map<string, number>();

@Controller('demo')
export class DemoController {
  constructor(
    @Inject(HttpClientService) private readonly http: HttpClientService,
    @Inject(StorageService) private readonly storage: StorageService
  ) {}

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

  // Stream upload to storage; supports optional gzip transform
  // Usage: curl -X POST --data-binary @bigfile.bin "http://localhost:3000/demo/upload-stream?key=big.bin&gzip=1"
  @Post('upload-stream')
  async uploadStream(
    @Query('key') key: string,
    @Query('gzip') gzip = '0',
    @Query('contentType') contentType = 'application/octet-stream',
    @Req() req: FastifyRequest
  ) {
    if (!key) {
      return { ok: false, error: 'Missing key' };
    }
    const transforms = gzip === '1' || gzip === 'true' ? [createGzip()] : undefined;
    await this.storage.uploadStream(key, (req as any).raw, { contentType, transforms });
    return { ok: true, key, contentType, gzip: !!transforms };
  }

  // Stream download from storage; supports optional gunzip transform (if previously gzipped)
  // Usage: curl -L "http://localhost:3000/demo/download-stream?key=big.bin&gunzip=1" -o out.bin
  @Get('download-stream')
  async downloadStream(
    @Query('key') key: string,
    @Query('gunzip') gunzip = '0',
    @Query('contentType') contentType = 'application/octet-stream',
    @Res() reply: FastifyReply
  ) {
    if (!key) {
      return reply.status(400).send({ ok: false, error: 'Missing key' });
    }
    const transforms = gunzip === '1' || gunzip === 'true' ? [createGunzip()] : undefined;
    const stream = await this.storage.downloadStream(key, { transforms });
    reply.header('Content-Type', contentType);
    reply.header('Cache-Control', 'no-store');
    return reply.send(stream as any);
  }
}
