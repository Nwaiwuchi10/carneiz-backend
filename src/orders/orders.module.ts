import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './order.entity.js';
import { StoreSettings, StoreSettingsSchema } from '../settings/settings.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: StoreSettings.name, schema: StoreSettingsSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
