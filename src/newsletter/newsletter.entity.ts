import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NewsletterDocument = Newsletter & Document;

@Schema({ timestamps: true })
export class Newsletter {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ default: 'CARNEIZ10' })
  discountCode: string;

  @Prop({ default: 10 })
  discountPercent: number;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ default: 'website_footer' })
  source: string;

  @Prop({ default: true })
  syncedWhatsApp: boolean;
}

export const NewsletterSchema = SchemaFactory.createForClass(Newsletter);
