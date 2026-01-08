import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WinstonLoggerService implements LoggerService {
    private logger: winston.Logger;

    constructor(private configService: ConfigService) {
        this.logger = winston.createLogger({
            level: configService.get<string>('LOG_LEVEL') || 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.json(),
            ),
            defaultMeta: { service: 'attendance-api' },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                            const contextStr = context ? `[${context}]` : '';
                            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
                            return `${timestamp} ${level} ${contextStr}: ${message} ${metaStr}`;
                        }),
                    ),
                }),
                new winston.transports.File({
                    filename: 'logs/error.log',
                    level: 'error',
                }),
                new winston.transports.File({
                    filename: 'logs/combined.log',
                }),
            ],
        });

        // Handle uncaught exceptions
        this.logger.exceptions.handle(
            new winston.transports.File({ filename: 'logs/exceptions.log' }),
        );
    }

    log(message: string, context?: string) {
        this.logger.info(message, { context });
    }

    error(message: string, trace?: string, context?: string) {
        this.logger.error(message, { trace, context });
    }

    warn(message: string, context?: string) {
        this.logger.warn(message, { context });
    }

    debug(message: string, context?: string) {
        this.logger.debug(message, { context });
    }

    verbose(message: string, context?: string) {
        this.logger.verbose(message, { context });
    }

    // Custom methods for structured logging
    logRequest(method: string, url: string, statusCode: number, duration: number, userId?: string) {
        this.logger.info('HTTP Request', {
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            userId,
        });
    }

    logAudit(action: string, entity: string, entityId: string, userId: string, changes?: object) {
        this.logger.info('Audit Log', {
            action,
            entity,
            entityId,
            userId,
            changes,
            context: 'AUDIT',
        });
    }
}
