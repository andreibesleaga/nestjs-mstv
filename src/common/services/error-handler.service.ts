import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  logError(context: string, error: any, additionalInfo?: any): void {
    const errorInfo = {
      context,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...additionalInfo,
    };

    // Remove sensitive information
    if (errorInfo.email) {
      errorInfo.email = this.sanitizeEmail(errorInfo.email);
    }

    this.logger.error('Application error occurred', errorInfo);
  }

  logWarning(context: string, message: string, additionalInfo?: any): void {
    const warningInfo = {
      context,
      message,
      timestamp: new Date().toISOString(),
      ...additionalInfo,
    };

    this.logger.warn(message, warningInfo);
  }

  private sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') return '[INVALID_EMAIL]';
    const [local, domain] = email.split('@');
    if (!local || !domain) return '[INVALID_EMAIL]';
    return `${local.substring(0, 3)}***@${domain}`;
  }

  sanitizeLogData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'authorization', 'cookie', 'secret'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    if (sanitized.email) {
      sanitized.email = this.sanitizeEmail(sanitized.email);
    }

    return sanitized;
  }
}
