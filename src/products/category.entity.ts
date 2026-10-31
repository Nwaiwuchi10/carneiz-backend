import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description: string;

  @Prop()
  heroCover: string;

  @Prop()
  image: string;

  @Prop({ default: 0 })
  displayPosition: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [{ name: String, slug: String }], default: [] })
  subcategories: any[];
}

export const CategorySchema = SchemaFactory.createForClass(Category);
