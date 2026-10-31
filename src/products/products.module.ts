import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './product.entity.js';
import { User, UserSchema } from '../users/user.entity.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }, { name: User.name, schema: UserSchema }]),
    CloudinaryModule
  ],
  controllers: [ProductsController],
  providers: [ProductsService]
})
export class ProductsModule {}
