import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as fs from 'fs';

@Injectable()
export class HttpsService {
  private readonly logger = new Logger(HttpsService.name);

  getHttpsOptions() {
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
    return new Promise((resolve, reject) => {
      const options = {
        method: data ? 'POST' : 'GET',
        headers: data ? { 'Content-Type': 'application/json' } : {},
      };

      const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
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