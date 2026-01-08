import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // Add request ID for tracing
        const requestId = req.headers['x-request-id'] || uuidv4();
        req.headers['x-request-id'] = requestId as string;
        res.setHeader('x-request-id', requestId);

        // Add request timestamp
        (req as any).requestTime = Date.now();

        next();
    }
}
