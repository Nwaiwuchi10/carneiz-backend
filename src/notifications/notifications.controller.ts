import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('user')
  async getUserNotifications(
    @Query('email') email?: string,
    @Query('userId') userId?: string,
  ) {
    return this.notificationsService.getUserNotifications(email, userId);
  }

  @Get('admin')
  async getAdminNotifications() {
    return this.notificationsService.getAdminNotifications();
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-all')
  async markAllAsRead(
    @Body() body: { recipientType?: 'admin' | 'user'; email?: string; userId?: string },
  ) {
    const recipient = body.recipientType || 'user';
    return this.notificationsService.markAllAsRead(recipient, body.email, body.userId);
  }
}
