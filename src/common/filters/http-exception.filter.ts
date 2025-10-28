import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Handle validation errors with detailed messages
    if (
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const errorResponse = exceptionResponse as Record<string, unknown>;

      // If it's a validation error with an array of messages
      if (Array.isArray(errorResponse.message)) {
        return response.status(status).json({
          statusCode: status,
          error: errorResponse.error || 'Bad Request',
          message: errorResponse.message,
          timestamp: new Date().toISOString(),
        });
      }

      // Single message error
      return response.status(status).json({
        statusCode: status,
        error: errorResponse.error || exception.name,
        message: errorResponse.message,
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback for string responses
    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exceptionResponse,
      timestamp: new Date().toISOString(),
    });
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    console.error('Unhandled exception:', exception);

    response.status(status).json({
      statusCode: status,
      error:
        exception instanceof HttpException
          ? exception.name
          : 'Internal Server Error',
      message: message,
      timestamp: new Date().toISOString(),
    });
  }
}
