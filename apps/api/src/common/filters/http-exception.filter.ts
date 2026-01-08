import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WinstonLoggerService } from '../services/logger.service';

interface ErrorResponse {
    statusCode: number;
    message: string;
    error: string;
    timestamp: string;
    path: string;
    requestId?: string;
    details?: any;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    constructor(private readonly logger: WinstonLoggerService) { }

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status: number;
        let message: string;
        let error: string;
        let details: any;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
                error = HttpStatus[status];
            } else if (typeof exceptionResponse === 'object') {
                const responseObj = exceptionResponse as any;
                message = responseObj.message || exception.message;
                error = responseObj.error || HttpStatus[status];
                details = responseObj.details;
            } else {
                message = exception.message;
                error = HttpStatus[status];
            }
        } else if (exception instanceof Error) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            error = 'Internal Server Error';

            // Log the actual error for debugging
            this.logger.error(
                exception.message,
                exception.stack,
                'HttpExceptionFilter',
            );
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'An unexpected error occurred';
            error = 'Internal Server Error';
        }

        const errorResponse: ErrorResponse = {
            statusCode: status,
            message: Array.isArray(message) ? message.join(', ') : message,
            error,
            timestamp: new Date().toISOString(),
            path: request.url,
        };

        if (details) {
            errorResponse.details = details;
        }

        // Add request ID if available
        const requestId = request.headers['x-request-id'];
        if (requestId) {
            errorResponse.requestId = requestId as string;
        }

        // Log error
        this.logger.warn(
            `${request.method} ${request.url} - ${status}`,
            'HttpExceptionFilter',
        );

        response.status(status).json(errorResponse);
    }
}
