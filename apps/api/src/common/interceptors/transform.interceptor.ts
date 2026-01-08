import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, ApiResponse<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T>> {
        return next.handle().pipe(
            map((data) => {
                // If data already has success property, it's already formatted
                if (data && typeof data === 'object' && 'success' in data) {
                    return data;
                }

                // Check if data is paginated result
                if (data && typeof data === 'object' && 'items' in data && 'meta' in data) {
                    return {
                        success: true,
                        data: data.items,
                        meta: data.meta,
                    };
                }

                return {
                    success: true,
                    data,
                };
            }),
        );
    }
}
