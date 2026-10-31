import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  findAll(): Promise<User[]> {
    return this.userModel.find().sort({ createdAt: -1 }).exec();
  }

  async updateRole(id: string, role: string): Promise<User> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select('-password');
    if (!updatedUser) {
      throw new Error('User not found');
    }
    return updatedUser;
  }

  async getAddresses(userId?: string) {
    if (userId) {
      const user = await this.userModel.findById(userId).exec();
      if (user && user.addresses) {
        return user.addresses;
      }
    }
    return [];
  }

  async addAddress(userId: string | undefined, addressData: any) {
    const newAddress = {
      id: `addr-${Date.now()}`,
      title: addressData.title || 'Home',
      isDefault: Boolean(addressData.isDefault),
      streetAddress: addressData.streetAddress || '',
      city: addressData.city || '',
      state: addressData.state || '',
      postalCode: addressData.postalCode || '',
      phoneNumber: addressData.phoneNumber || '',
    };

    if (userId) {
      const user = await this.userModel.findById(userId).exec();
      if (user) {
        if (!user.addresses) user.addresses = [];
        if (newAddress.isDefault) {
          user.addresses.forEach((a: any) => { a.isDefault = false; });
        }
        user.addresses.push(newAddress);
        await user.save();
        return user.addresses;
      }
    }

    return newAddress;
  }

  async updateAddress(userId: string | undefined, addressId: string, addressData: any) {
    if (userId) {
      const user = await this.userModel.findById(userId).exec();
      if (user && user.addresses) {
        if (addressData.isDefault) {
          user.addresses.forEach((a: any) => { a.isDefault = false; });
        }
        const index = user.addresses.findIndex((a: any) => a.id === addressId);
        if (index !== -1) {
          user.addresses[index] = {
            ...user.addresses[index],
            ...addressData,
            id: addressId,
          };
          await user.save();
          return user.addresses;
        }
      }
    }
    return { ...addressData, id: addressId };
  }

  async deleteAddress(userId: string | undefined, addressId: string) {
    if (userId) {
      const user = await this.userModel.findById(userId).exec();
      if (user && user.addresses) {
        user.addresses = user.addresses.filter((a: any) => a.id !== addressId);
        await user.save();
        return user.addresses;
      }
    }
    return { success: true, message: 'Address deleted' };
  }
}