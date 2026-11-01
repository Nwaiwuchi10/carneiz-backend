import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ unique: true, required: true })
  orderId: string;

  @Prop({ type: Object, required: true })
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };

  @Prop({ type: [{ name: String, weight: String, quantity: Number, price: Number }], required: true })
  items: any[];

  @Prop({ required: true })
  subtotal: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ required: true })
  deliveryFee: number;

  @Prop({ default: 500 })
  serviceFee: number;

  @Prop({ default: 'delivery' })
  fulfillmentType: string; // 'delivery' or 'pickup'

  @Prop({ default: '' })
  pickupAddress: string;

  @Prop({ required: true })
  total: number;

  @Prop({ default: 'New' })
  status: string; // New, Processing, Packed, Out for Delivery, Delivered, Cancelled

  @Prop({ default: () => Math.floor(1000 + Math.random() * 9000).toString() })
  deliveryPin: string; // Secret 4-digit PIN given to customer to confirm delivery

  @Prop({ default: 'Standard Cold-Chain Delivery (2-3 Business Days)' })
  deliveryWindow: string;

  @Prop({ default: 'Flutterwave' })
  paymentMethod: string;

  @Prop({ default: null })
  deliveredAt: Date;

  @Prop({ default: null })
  receivedBy: string;

  @Prop({ type: [{ user: String, date: String, text: String }], default: [] })
  notes: any[];

  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
