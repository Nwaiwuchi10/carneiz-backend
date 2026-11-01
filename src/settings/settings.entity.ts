import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StoreSettingsDocument = StoreSettings & Document;

@Schema({ _id: false })
class BusinessInfo {
  @Prop({ default: 'Carneiz Premium Meats' })
  businessName: string;

  @Prop({ default: 'Fresh Farm Cuts & Cold-Chain Butchery' })
  primaryIndustry: string;

  @Prop({ default: 'Victoria Island, Lagos, Nigeria' })
  businessAddress: string;

  @Prop({ default: '101241' })
  postalCode: string;

  @Prop({ default: 'Africa/Lagos (WAT)' })
  timezone: string;

  @Prop({ default: 'NGN (₦)' })
  currency: string;

  @Prop({ default: 2500 })
  deliveryFee: number;

  @Prop({ default: 500 })
  serviceFee: number;

  @Prop({ default: 'Carneiz Flagship Store, Plot 14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria' })
  pickupAddress: string;

  @Prop({ default: 'Mon - Sat: 8:00 AM - 7:00 PM' })
  pickupHours: string;

  @Prop({ type: [{ code: String, percent: Number, active: Boolean, description: String }], default: [
    { code: 'CARNEIZ10', percent: 10, active: true, description: 'Newsletter Welcome 10% Discount' },
    { code: 'CARNEIZ5', percent: 5, active: true, description: 'General Store 5% Discount' }
  ] })
  discountCodes: Array<{ code: string; percent: number; active: boolean; description?: string }>;
}

@Schema({ _id: false })
class SecuritySettings {
  @Prop({ default: true })
  twoFactorEnabled: boolean;
}

@Schema({ _id: false })
class NotificationSettings {
  @Prop({ default: true })
  newOrders: boolean;

  @Prop({ default: false })
  disputes: boolean;

  @Prop({ default: true })
  lowStock: boolean;

  @Prop({ default: true })
  weeklySummaries: boolean;
}

@Schema({ timestamps: true })
export class StoreSettings {
  @Prop({ default: 'default' })
  settingsId: string;

  @Prop({ type: BusinessInfo, default: () => ({}) })
  general: BusinessInfo;

  @Prop({ type: SecuritySettings, default: () => ({}) })
  security: SecuritySettings;

  @Prop({ type: NotificationSettings, default: () => ({}) })
  notification: NotificationSettings;
}

export const StoreSettingsSchema = SchemaFactory.createForClass(StoreSettings);
