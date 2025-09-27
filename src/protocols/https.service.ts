import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as fs from 'fs';
import { FeatureFlagsService } from '../common/services/feature-flags.service';
import { HttpsRequestOptions, HttpsResponse } from '../common/types';

@Injectable()
export class HttpsService {
  private readonly logger = new Logger(HttpsService.name);
  private isEnabled = false;

  constructor(private readonly featureFlags: FeatureFlagsService) {
    this.isEnabled = this.featureFlags.isHttpsEnabled;
    if (!this.isEnabled) {
      this.logger.log('HTTPS service is disabled by feature flag');
    }
  }

  getHttpsOptions() {
    if (!this.isEnabled) {
      this.logger.warn('HTTPS service is disabled');
      return null;
    }

    if (!process.env.SSL_CERT_PATH || !process.env.SSL_KEY_PATH) {
      this.logger.warn('SSL certificates not configured - using HTTP');
      return null;
    }

    try {
      return {
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH),
      };
    } catch (error) {
      this.logger.error('Failed to load SSL certificates:', error.message);
      return null;
    }
  }

  async makeSecureRequest<T = Record<string, unknown>>(
    url: string,
    data?: Record<string, unknown>,
    options: HttpsRequestOptions = {}
  ): Promise<HttpsResponse<T> | null> {
    if (!this.isEnabled) {
      this.logger.warn('HTTPS service is disabled - request ignored');
      return null;
    }

    return new Promise((resolve, reject) => {
      const requestOptions = {
        method: options.method || (data ? 'POST' : 'GET'),
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          ...(data ? { 'Content-Type': 'application/json' } : {}),
        },
        timeout: options.timeout || 5000,
      };

      const req = https.request(url, requestOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(body) as T;
            resolve({
              data: parsedData,
              status: res.statusCode || 0,
              headers: res.headers as Record<string, string>,
              success: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            });
          } catch {
            resolve({
              data: body as T,
              status: res.statusCode || 0,
              headers: res.headers as Record<string, string>,
              success: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            });
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error('HTTPS request failed:', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }
}
