import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { WinstonLoggerService } from './common/services/logger.service';

let appPromise: Promise<any>;

async function bootstrap() {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(), {
        bufferLogs: true,
    });

    const configService = app.get(ConfigService);
    const logger = app.get(WinstonLoggerService);

    app.useLogger(logger);
    app.use(helmet());
    app.use(compression());

    app.enableCors({
        origin: configService.get<string>('FRONTEND_URL') || '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });

    app.setGlobalPrefix('api');
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    app.useGlobalFilters(new HttpExceptionFilter(logger));
    app.useGlobalInterceptors(
        new LoggingInterceptor(logger),
        new TransformInterceptor(),
    );

    await app.init();
    return app.getHttpAdapter().getInstance();
}

export default async function handler(req: any, res: any) {
    if (!appPromise) {
        appPromise = bootstrap();
    }
    const app = await appPromise;
    app(req, res);
}
