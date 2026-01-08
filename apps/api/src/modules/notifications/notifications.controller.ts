import {
    Controller,
    Get,
    Put,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    @ApiOperation({ summary: 'Get my notifications' })
    async getMyNotifications(
        @CurrentUser() user: any,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.notificationsService.getMyNotifications(
            user.id,
            page ? +page : 1,
            limit ? +limit : 20,
        );
    }

    @Put('read-all')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    async markAllAsRead(@CurrentUser() user: any) {
        return this.notificationsService.markAllAsRead(user.id);
    }

    @Put(':id/read')
    @ApiOperation({ summary: 'Mark notification as read' })
    async markAsRead(
        @CurrentUser() user: any,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.notificationsService.markAsRead(id, user.id);
    }
}
