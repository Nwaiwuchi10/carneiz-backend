import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './notification.entity.js';

export interface CreateNotificationDto {
  recipientType: 'admin' | 'user';
  userId?: string;
  userEmail?: string;
  title: string;
  message: string;
  type: 'account' | 'auth' | 'order' | 'delivery' | 'payment' | 'general';
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<NotificationDocument> {
    try {
      const notif = new this.notificationModel({
        recipientType: dto.recipientType,
        userId: dto.userId,
        userEmail: dto.userEmail ? dto.userEmail.toLowerCase().trim() : undefined,
        title: dto.title,
        message: dto.message,
        type: dto.type,
        read: false,
        metadata: dto.metadata || {},
      });
      return await notif.save();
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async getUserNotifications(email?: string, userId?: string) {
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    const cleanUserId = userId ? userId.trim() : '';

    // If neither email nor userId is provided, do NOT expose user notifications
    if (!cleanEmail && !cleanUserId) {
      return {
        data: [],
        unreadCount: 0,
      };
    }

    const conditions: any[] = [];
    if (cleanEmail) {
      conditions.push({ userEmail: cleanEmail });
    }
    if (cleanUserId) {
      conditions.push({ userId: cleanUserId });
    }

    const filter: any = {
      recipientType: 'user',
      $or: conditions,
    };

    const notifications = await this.notificationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    const unreadCount = await this.notificationModel.countDocuments({
      ...filter,
      read: false,
    });

    return {
      data: notifications,
      unreadCount,
    };
  }

  async getAdminNotifications() {
    const filter = { recipientType: 'admin' };
    const notifications = await this.notificationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(60)
      .exec();

    const unreadCount = await this.notificationModel.countDocuments({
      ...filter,
      read: false,
    });

    return {
      data: notifications,
      unreadCount,
    };
  }

  async markAsRead(id: string) {
    const notification = await this.notificationModel.findByIdAndUpdate(
      id,
      { $set: { read: true } },
      { new: true },
    );
    return {
      message: 'Notification marked as read',
      data: notification,
    };
  }

  async markAllAsRead(recipientType: 'admin' | 'user', email?: string, userId?: string) {
    const filter: any = { recipientType };
    if (recipientType === 'user') {
      const cleanEmail = email ? email.toLowerCase().trim() : '';
      const cleanUserId = userId ? userId.trim() : '';
      if (!cleanEmail && !cleanUserId) {
        return {
          message: 'User email or ID is required to mark notifications as read',
          success: false,
        };
      }
      const conditions: any[] = [];
      if (cleanEmail) conditions.push({ userEmail: cleanEmail });
      if (cleanUserId) conditions.push({ userId: cleanUserId });
      filter.$or = conditions;
    }

    await this.notificationModel.updateMany(filter, { $set: { read: true } });

    return {
      message: `All ${recipientType} notifications marked as read`,
      success: true,
    };
  }
}
