import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { WinstonLoggerService } from '../services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(private readonly logger: WinstonLoggerService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();
        const startTime = Date.now();

        const { method, url, body, query, params } = request;
        const userAgent = request.get('user-agent') || '';
        const ip = request.ip;
        const userId = (request as any).user?.id;

        // Log incoming request (only in debug mode)
        if (process.env.LOG_LEVEL === 'debug') {
            this.logger.debug(
                `Incoming Request: ${method} ${url}`,
                'LoggingInterceptor',
            );
        }

        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = Date.now() - startTime;
                    this.logger.logRequest(
                        method,
                        url,
                        response.statusCode,
                        duration,
                        userId,
                    );
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    this.logger.error(
                        `${method} ${url} - Error after ${duration}ms: ${error.message}`,
                        error.stack,
                        'LoggingInterceptor',
                    );
                },
            }),
        );
    }
}
