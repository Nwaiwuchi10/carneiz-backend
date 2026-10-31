import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, enum: ['admin', 'user'], default: 'user' })
  recipientType: string;

  @Prop()
  userId?: string;

  @Prop()
  userEmail?: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, default: 'general' })
  type: string; // 'account' | 'auth' | 'order' | 'delivery' | 'payment' | 'general'

  @Prop({ default: false })
  read: boolean;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
