// Server restart trigger
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { WinstonLoggerService } from './common/services/logger.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
    });

    // Increase body limit for Base64 image uploads
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }));

    const configService = app.get(ConfigService);
    const logger = app.get(WinstonLoggerService);

    app.useLogger(logger);

    // Security middleware
    app.use(helmet());
    app.use(compression());

    // CORS configuration
    app.enableCors({
        origin: configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });

    // API prefix and versioning
    app.setGlobalPrefix('api');
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
    });

    // Global pipes
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

    // Global filters and interceptors
    app.useGlobalFilters(new HttpExceptionFilter(logger));
    app.useGlobalInterceptors(
        new LoggingInterceptor(logger),
        new TransformInterceptor(),
    );

    // Swagger documentation
    if (configService.get<string>('ENABLE_API_DOCS') === 'true') {
        const config = new DocumentBuilder()
            .setTitle('Attendance SaaS API')
            .setDescription('Enterprise-grade Attendance Management System API')
            .setVersion('1.0')
            .addBearerAuth(
                {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    name: 'JWT',
                    description: 'Enter JWT token',
                    in: 'header',
                },
                'JWT-auth',
            )
            .addTag('Authentication', 'User authentication and authorization')
            .addTag('Companies', 'Company/tenant management')
            .addTag('Employees', 'Employee management')
            .addTag('Departments', 'Department management')
            .addTag('Attendance', 'Attendance tracking')
            .addTag('Leaves', 'Leave management')
            .addTag('Shifts', 'Shift management')
            .addTag('Reports', 'Reports and analytics')
            .addTag('Subscription', 'Billing and subscriptions')
            .build();

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document);
    }

    const port = configService.get<number>('PORT') || 3001;

    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}/api`, 'Bootstrap');
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
