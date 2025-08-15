import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as fs from 'fs';
import { FeatureFlagsService } from '../common/feature-flags.service';

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

  async makeSecureRequest(url: string, data?: any): Promise<any> {
    if (!this.isEnabled) {
      this.logger.warn('HTTPS service is disabled - request ignored');
      return null;
    }

    return new Promise((resolve, reject) => {
      const options = {
        method: data ? 'POST' : 'GET',
        headers: data ? { 'Content-Type': 'application/json' } : {},
      };

      const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }
}
