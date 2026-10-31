import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema()
class TransactionItem {
  @Prop()
  name: string;

  @Prop()
  rate: number;

  @Prop()
  qty: number;

  @Prop()
  amount: number;
}

@Schema()
class TransactionLog {
  @Prop()
  time: string;

  @Prop()
  title: string;

  @Prop()
  description: string;
}

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true, unique: true })
  transactionId: string;

  @Prop({ required: false })
  orderId: string;

  @Prop({ type: Object, required: true })
  customer: {
    name: string;
    email: string;
    phone: string;
  };

  @Prop({ required: true })
  paymentMethod: string;

  @Prop({ required: true })
  gateway: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'Pending' })
  status: string; // Successful, Pending, Failed

  @Prop({ type: [TransactionItem], default: [] })
  items: TransactionItem[];

  @Prop({ type: [TransactionLog], default: [] })
  logs: TransactionLog[];

  createdAt: Date;
  updatedAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
