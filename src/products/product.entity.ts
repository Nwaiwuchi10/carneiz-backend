import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  category: string;

  @Prop()
  subcategory: string;

  @Prop()
  sku: string;

  @Prop({ required: true })
  weight: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: true })
  inStock: boolean;

  @Prop({ default: 0 })
  stockQuantity: number;

  @Prop({ default: 'Active' })
  status: string; // Active, Draft, Out of Stock

  @Prop({ default: 5 })
  rating: number;

  @Prop({ default: 0 })
  numReviews: number;

  @Prop({ type: [{ weight: String, price: Number, stock: Number, active: Boolean }], default: [] })
  variants: any[];

  @Prop()
  protein: string;

  @Prop()
  calories: string;

  @Prop()
  fat: string;

  @Prop()
  carbs: string;

  @Prop()
  storageInstructions: string;

  @Prop()
  deliveryEstimate: string;

  @Prop()
  originLocation: string;

  @Prop({ type: [{ user: String, date: String, rating: Number, comment: String, verified: Boolean }], default: [] })
  reviews: any[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
