import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ unique: true, required: true })
  email: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ default: 'Active' })
  status: string; // Active, Churned

  @Prop({ default: 0 })
  loyaltyPoints: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  profilePicture: string;

  @Prop({
    type: [
      {
        id: String,
        title: { type: String, default: 'Home' },
        isDefault: { type: Boolean, default: false },
        streetAddress: { type: String, required: true },
        city: { type: String, default: 'Lagos' },
        state: { type: String, default: 'Lagos' },
        postalCode: { type: String, default: '100001' },
        phoneNumber: { type: String, default: '+234 803 123 4567' },
      },
    ],
    default: [],
  })
  addresses: any[];

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);