import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Newsletter, NewsletterDocument } from './newsletter.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectModel(Newsletter.name)
    private newsletterModel: Model<NewsletterDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async subscribe(email: string, phone?: string) {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('A valid email address is required.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await this.newsletterModel.findOne({ email: cleanEmail });

    if (existing) {
      return {
        success: true,
        isExisting: true,
        message: 'Welcome back! You are already subscribed to our mailing list.',
        discountCode: existing.discountCode || 'CARNEIZ10',
        email: cleanEmail,
        syncedWhatsApp: true,
      };
    }

    const newSubscriber = new this.newsletterModel({
      email: cleanEmail,
      phone: phone ? phone.trim() : undefined,
      discountCode: 'CARNEIZ10',
      discountPercent: 10,
      status: 'active',
      source: 'website_footer',
      syncedWhatsApp: true,
    });

    await newSubscriber.save();

    // Trigger Admin Notification for instant awareness
    try {
      await this.notificationsService.create({
        recipientType: 'admin',
        title: 'New Newsletter Subscriber (10% Off Claimed)',
        message: `Customer ${cleanEmail} subscribed for 10% off with coupon code CARNEIZ10 and synced via WhatsApp.`,
        type: 'general',
        metadata: {
          email: cleanEmail,
          discountCode: 'CARNEIZ10',
          source: 'website_footer',
        },
      });
    } catch (e) {
      console.warn('Could not create notification for newsletter subscriber:', e);
    }

    return {
      success: true,
      isExisting: false,
      message: 'Successfully subscribed! Enjoy 10% off your first order.',
      discountCode: 'CARNEIZ10',
      email: cleanEmail,
      syncedWhatsApp: true,
    };
  }

  async getAllSubscribers() {
    return this.newsletterModel.find().sort({ createdAt: -1 }).exec();
  }
}
