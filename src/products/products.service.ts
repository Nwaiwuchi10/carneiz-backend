import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './product.entity.js';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {}

  async create(createProductDto: any) {
    const newProduct = new this.productModel(createProductDto);
    return newProduct.save();
  }

  async findAll(query: any) {
    const { search, category, inStock, weight, minPrice, maxPrice, featured, isFeatured, page = 1, limit = 20 } = query;
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (category && category.toLowerCase() !== 'all') {
      const catLower = category.toLowerCase();
      if (catLower.includes('chicken') || catLower.includes('poultry')) {
        filter.category = { $regex: /chicken|poultry/i };
      } else if (catLower.includes('goat')) {
        filter.category = { $regex: /goat/i };
      } else if (catLower.includes('fish') || catLower.includes('seafood')) {
        filter.category = { $regex: /fish|seafood/i };
      } else {
        filter.category = { $regex: new RegExp(category, 'i') };
      }
    }
    if (inStock !== undefined && inStock !== '') {
      filter.inStock = inStock === 'true' || inStock === true;
    }
    if (weight && weight.toLowerCase() !== 'all') {
      const sanitizedWeight = weight.replace(/\s+/g, '\\s*');
      filter.weight = { $regex: sanitizedWeight, $options: 'i' };
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined && minPrice !== '') filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined && maxPrice !== '') filter.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const products = await this.productModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).exec();
    const total = await this.productModel.countDocuments(filter);

    return {
      data: products,
      total,
      page: Number(page),
      lastPage: Math.ceil(total / Number(limit)) || 1
    };
  }

  async findOne(id: string) {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, updateProductDto: any) {
    const updatedProduct = await this.productModel.findByIdAndUpdate(id, updateProductDto, { new: true }).exec();
    if (!updatedProduct) throw new NotFoundException('Product not found');
    return updatedProduct;
  }

  async remove(id: string) {
    const deletedProduct = await this.productModel.findByIdAndDelete(id).exec();
    if (!deletedProduct) throw new NotFoundException('Product not found');
    return deletedProduct;
  }

  async addReview(id: string, reviewData: { user?: string; rating: number; comment: string; photos?: string[]; productName?: string }) {
    let product: any = null;
    if (id && id !== 'general') {
      try {
        if (/^[0-9a-fA-F]{24}$/.test(id)) {
          product = await this.productModel.findById(id).exec();
        } else {
          product = await this.productModel.findOne({ name: { $regex: id, $options: 'i' } }).exec();
        }
      } catch (e) {}
    }

    if (!product && reviewData.productName) {
      product = await this.productModel.findOne({ name: { $regex: reviewData.productName, $options: 'i' } }).exec();
    }

    if (!product) {
      throw new NotFoundException('Product not found to add review for.');
    }

    const newReview = {
      user: reviewData.user || 'Customer',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      rating: Number(reviewData.rating) || 5,
      comment: reviewData.comment || '',
      photos: reviewData.photos || [],
      status: 'Pending Moderation',
      verified: true
    };

    if (!product.reviews) {
      product.reviews = [];
    }
    product.reviews.unshift(newReview);
    product.numReviews = product.reviews.length;
    const totalRating = product.reviews.reduce((acc: number, r: any) => acc + (r.rating || 5), 0);
    product.rating = Math.round((totalRating / product.reviews.length) * 10) / 10;
    await product.save();

    return {
      success: true,
      message: 'Review submitted successfully. It is currently pending moderation and will appear on the store shortly once approved.',
      review: newReview,
      productName: product.name
    };
  }
}
