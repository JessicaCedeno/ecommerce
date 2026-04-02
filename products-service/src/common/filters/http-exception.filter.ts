import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exResponse = exception instanceof HttpException ? exception.getResponse() : null;

    // ValidationPipe wraps errors as { message: string[], error: string, statusCode }
    // Other HttpExceptions use a plain string or { message: string }
    const message = (() => {
      if (typeof exResponse === 'string') return exResponse;
      if (typeof exResponse === 'object' && exResponse !== null) {
        return (exResponse as Record<string, unknown>)['message'] ?? (exception as Error).message;
      }
      return exception instanceof Error ? exception.message : 'Internal server error';
    })();

    this.logger.error(
      `${request.method} ${request.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(status).json({ statusCode: status, timestamp: new Date().toISOString(), path: request.url, message });
  }
}
