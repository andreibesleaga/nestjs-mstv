import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errorCode = (exceptionResponse as any).error || errorCode;
      }
    } else {
      // Handle specific error types
      if (exception.code === 'P2002') {
        // Prisma unique constraint violation
        status = HttpStatus.CONFLICT;
        message = 'Resource already exists';
        errorCode = 'DUPLICATE_RESOURCE';
      } else if (exception.code === 'P2025') {
        // Prisma record not found
        status = HttpStatus.NOT_FOUND;
        message = 'Resource not found';
        errorCode = 'RESOURCE_NOT_FOUND';
      } else if (exception.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Validation failed';
        errorCode = 'VALIDATION_ERROR';
      } else if (exception.name === 'UnauthorizedError') {
        status = HttpStatus.UNAUTHORIZED;
        message = 'Unauthorized access';
        errorCode = 'UNAUTHORIZED';
      }
    }

    // Log the error
    this.logger.error({
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode: status,
      message: exception.message || message,
      stack: exception.stack,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });

    // Return structured error response
    const errorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          stack: exception.stack,
          originalError: exception.message,
        },
      }),
    };

    response.status(status).send(errorResponse);
  }
}
