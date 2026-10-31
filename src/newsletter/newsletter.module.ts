import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Newsletter, NewsletterSchema } from './newsletter.entity.js';
import { NewsletterService } from './newsletter.service.js';
import { NewsletterController } from './newsletter.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Newsletter.name, schema: NewsletterSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [NewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
