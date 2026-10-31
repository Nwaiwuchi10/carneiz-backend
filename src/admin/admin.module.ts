import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../orders/order.entity.js';
import { Product, ProductSchema } from '../products/product.entity.js';
import { Category, CategorySchema } from '../products/category.entity.js';
import { User, UserSchema } from '../users/user.entity.js';
import { Transaction, TransactionSchema } from '../transactions/transaction.entity.js';
import { StoreSettings, StoreSettingsSchema } from '../settings/settings.entity.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: User.name, schema: UserSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: StoreSettings.name, schema: StoreSettingsSchema }
    ]),
    CloudinaryModule
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
