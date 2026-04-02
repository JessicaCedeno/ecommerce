import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const httpResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    // ValidationPipe returns { message: string[], error: string, statusCode: number }
    // Other HttpExceptions return a string or { message: string }
    const message =
      typeof httpResponse === 'object' && httpResponse !== null
        ? ((httpResponse as Record<string, unknown>)['message'] ??
          exception instanceof Error)
          ? (exception as Error).message
          : 'Internal server error'
        : typeof httpResponse === 'string'
          ? httpResponse
          : exception instanceof Error
            ? exception.message
            : 'Internal server error';

    this.logger.error(
      `${req.method} ${req.url} - ${status}`,
      exception instanceof Error ? exception.stack : '',
    );
    res.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message,
    });
  }
}
