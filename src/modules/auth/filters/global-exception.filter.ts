import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Derive status code from known exception types or generic objects with statusCode
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : typeof (exception as any)?.statusCode === 'number'
          ? (exception as any).statusCode
          : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    this.logger.error(
      `${request.method} ${request.url}`,
      (exception as any)?.stack || String(exception)
    );

    response.status(status).send({
      success: false,
      error: {
        code: exception instanceof HttpException ? exception.constructor.name : 'INTERNAL_ERROR',
        message: typeof message === 'string' ? message : (message as any)?.message,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
