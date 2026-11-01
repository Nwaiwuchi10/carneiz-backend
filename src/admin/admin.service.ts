import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/order.entity.js';
import { Product, ProductDocument } from '../products/product.entity.js';
import { Category, CategoryDocument } from '../products/category.entity.js';
import { User, UserDocument } from '../users/user.entity.js';
import { Transaction, TransactionDocument } from '../transactions/transaction.entity.js';
import { StoreSettings, StoreSettingsDocument } from '../settings/settings.entity.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(StoreSettings.name) private storeSettingsModel: Model<StoreSettingsDocument>,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const allOrders = await this.orderModel.find().exec();
    
    const isValid = (o: any) => o.status === 'Delivered' || o.status === 'Paid' || o.status !== 'Cancelled';

    const getOrdersInPeriod = (start: Date, end: Date) => allOrders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= start && d < end;
    });

    const getRevenueInPeriod = (start: Date, end: Date) => getOrdersInPeriod(start, end).filter(isValid).reduce((sum, o) => sum + o.total, 0);

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const diff = current - previous;
      const perc = (diff / previous) * 100;
      return (perc > 0 ? '+' : '') + perc.toFixed(0) + '%';
    };

    const isPos = (change: string) => change.startsWith('+') || change === '0%';

    // Today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const ordersToday = getOrdersInPeriod(today, tomorrow).length;
    const ordersYesterday = getOrdersInPeriod(yesterday, today).length;
    const ordersTodayChange = calcChange(ordersToday, ordersYesterday);

    const revenueToday = getRevenueInPeriod(today, tomorrow);
    const revenueYesterday = getRevenueInPeriod(yesterday, today);
    const revenueTodayChange = calcChange(revenueToday, revenueYesterday);

    // Week
    const revenueThisWeek = getRevenueInPeriod(startOfWeek, tomorrow);
    const revenueLastWeek = getRevenueInPeriod(startOfLastWeek, startOfWeek);
    const revenueThisWeekChange = calcChange(revenueThisWeek, revenueLastWeek);

    // Month
    const revenueThisMonth = getRevenueInPeriod(startOfMonth, tomorrow);
    const revenueLastMonth = getRevenueInPeriod(startOfLastMonth, startOfMonth);
    const revenueThisMonthChange = calcChange(revenueThisMonth, revenueLastMonth);

    // Compute Pipeline
    const pipelineCounts: Record<string, number> = {
      'New': 0, 'Processing': 0, 'Packed': 0, 'Out for Delivery': 0, 'Delivered': 0, 'Cancelled': 0
    };
    allOrders.forEach(o => {
      if (pipelineCounts[o.status] !== undefined) {
        pipelineCounts[o.status]++;
      }
    });

    return {
      stats: {
        ordersToday: { value: ordersToday, change: ordersTodayChange, isPositive: isPos(ordersTodayChange) },
        revenueToday: { value: revenueToday, change: revenueTodayChange, isPositive: isPos(revenueTodayChange) },
        revenueThisWeek: { value: revenueThisWeek, change: revenueThisWeekChange, isPositive: isPos(revenueThisWeekChange) },
        revenueThisMonth: { value: revenueThisMonth, change: revenueThisMonthChange, isPositive: isPos(revenueThisMonthChange) },
      },
      pipeline: [
        { label: 'New', value: pipelineCounts['New'], max: Math.max(10, allOrders.length) },
        { label: 'Processing', value: pipelineCounts['Processing'], max: Math.max(10, allOrders.length) },
        { label: 'Packed', value: pipelineCounts['Packed'], max: Math.max(10, allOrders.length) },
        { label: 'Out for delivery', value: pipelineCounts['Out for Delivery'], max: Math.max(10, allOrders.length) },
        { label: 'Delivered', value: pipelineCounts['Delivered'], max: Math.max(10, allOrders.length) },
        { label: 'Cancelled', value: pipelineCounts['Cancelled'], max: Math.max(10, allOrders.length) },
      ],
      abandonedCarts: []
    };
  }

  async getOrders(query: any) {
    const { page = 1, limit = 10, search = '', status = '' } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const filter: any = {};
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') {
      filter.status = { $regex: `^${status}$`, $options: 'i' };
    }

    const [orders, total] = await Promise.all([
      this.orderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).exec(),
      this.orderModel.countDocuments(filter).exec()
    ]);

    const formattedOrders = orders.map(o => ({
      id: o.orderId,
      customer: o.customer.name,
      status: o.status,
      products: o.items.map(i => i.name).join(', '),
      total: o.total,
      date: new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    }));

    return {
      data: formattedOrders,
      total,
      page: Number(page),
      limit: Number(limit)
    };
  }

  async getOrderById(id: string) {
    const cleanId = id.startsWith('#') ? id : `#${id}`;
    const order = await this.orderModel.findOne({
      $or: [{ orderId: id }, { orderId: cleanId }, { orderId: id.replace(/^#/, '') }],
    }).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      id: order.orderId,
      customer: order.customer,
      items: order.items,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      serviceFee: order.serviceFee || 0,
      fulfillmentType: order.fulfillmentType || 'delivery',
      pickupAddress: order.pickupAddress || '',
      deliveryWindow: order.deliveryWindow || '',
      paymentMethod: order.paymentMethod || 'Flutterwave',
      total: order.total,
      status: order.status,
      deliveryPin: order.deliveryPin,
      notes: order.notes,
      createdAt: order.createdAt
    };
  }

  async updateOrderStatus(id: string, status: string, notes?: string) {
    const cleanId = id.startsWith('#') ? id : `#${id}`;
    const order = await this.orderModel.findOne({
      $or: [{ orderId: id }, { orderId: cleanId }, { orderId: id.replace(/^#/, '') }],
    }).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (status) {
      if (status.toLowerCase() === 'delivered') {
        throw new BadRequestException('The Delivered status is reserved for customer PIN authentication upon physical package delivery.');
      }
      order.status = status;
    }

    if (!order.notes) {
      order.notes = [];
    }

    if (!order.deliveryPin) {
      order.deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();
    }

    if (notes) {
      order.notes.push({
        user: 'Admin',
        date: new Date().toLocaleString('en-GB'),
        text: notes
      });
    }

    await order.save();

    return {
      success: true,
      message: 'Order updated successfully',
      data: { id: order.orderId, status: order.status, notes: order.notes, deliveryPin: order.deliveryPin }
    };
  }

  async verifyOrderPin(id: string, pin: string, receivedBy?: string) {
    const cleanId = id.startsWith('#') ? id : `#${id}`;
    const order = await this.orderModel.findOne({
      $or: [{ orderId: id }, { orderId: cleanId }, { orderId: id.replace(/^#/, '') }],
    }).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!pin || String(order.deliveryPin).trim() !== String(pin).trim()) {
      throw new BadRequestException('Invalid pickup PIN provided. Please check the 4-digit PIN given to the customer.');
    }

    const isPickup = order.fulfillmentType === 'pickup';
    order.status = 'Delivered';
    order.deliveredAt = new Date();
    order.receivedBy = receivedBy || order.customer?.name || 'Customer';

    order.notes = order.notes || [];
    order.notes.push({
      user: 'Store Admin',
      date: new Date().toLocaleString('en-GB'),
      text: isPickup
        ? `Customer verified pickup PIN (${pin}) at Carneiz Flagship Store. Package handed over to ${order.receivedBy}.`
        : `Customer delivery PIN (${pin}) authenticated. Handed over to ${order.receivedBy}.`
    });

    await order.save();

    return {
      success: true,
      message: isPickup
        ? 'Pickup PIN verified successfully! Order marked as Delivered / Collected.'
        : 'Delivery PIN verified successfully! Order marked as Delivered.',
      data: {
        id: order.orderId,
        status: order.status,
        fulfillmentType: order.fulfillmentType,
        deliveryPin: order.deliveryPin,
        deliveredAt: order.deliveredAt,
        receivedBy: order.receivedBy,
        notes: order.notes,
      }
    };
  }

  // ---- PRODUCTS ----
  
  async getProductsStats() {
    const allProducts = await this.productModel.find().exec();
    const total = allProducts.length;
    const inStock = allProducts.filter(p => p.stockQuantity > 0 || p.status === 'Active').length;
    const outOfStock = total - inStock;
    
    // Compute trending dynamically from recent orders (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrders = await this.orderModel.find({ createdAt: { $gte: thirtyDaysAgo } }).exec();
    
    const productSalesMap: Record<string, number> = {};
    recentOrders.forEach(o => {
      (o.items || []).forEach(item => {
        productSalesMap[item.name] = (productSalesMap[item.name] || 0) + (item.quantity || 1);
      });
    });

    // Trending = products with >= 5 units sold recently, or fallback to top 10% if none
    let trending = Object.values(productSalesMap).filter(qty => qty >= 5).length;
    if (trending === 0 && total > 0) trending = Math.floor(total * 0.1);

    return {
      total,
      trending,
      inStock,
      outOfStock
    };
  }

  async getProducts(query: any) {
    const { page = 1, limit = 10, search = '', category = '', status = '' } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (status && status !== 'All') {
      filter.status = status;
    }

    const [products, total] = await Promise.all([
      this.productModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).exec(),
      this.productModel.countDocuments(filter).exec()
    ]);

    return {
      data: products,
      total,
      page: Number(page),
      limit: Number(limit)
    };
  }

  async getProductById(id: string) {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async createProduct(data: any, files?: { coverImage?: Express.Multer.File[], images?: Express.Multer.File[] }) {
    if (data.variants && typeof data.variants === 'string') {
      try { data.variants = JSON.parse(data.variants); } catch (e) {}
    }
    
    if (files?.coverImage && files.coverImage[0]) {
      const uploadResult = await this.cloudinaryService.uploadFile(files.coverImage[0]);
      data.imageUrl = uploadResult.secure_url;
    }

    if (files?.images && files.images.length > 0) {
      data.images = [];
      for (const file of files.images) {
        const uploadResult = await this.cloudinaryService.uploadFile(file);
        data.images.push(uploadResult.secure_url);
      }
    }

    const newProduct = new this.productModel(data);
    await newProduct.save();
    return { success: true, message: 'Product created', data: newProduct };
  }

  async updateProduct(id: string, data: any, files?: { coverImage?: Express.Multer.File[], images?: Express.Multer.File[] }) {
    if (data.variants && typeof data.variants === 'string') {
      try { data.variants = JSON.parse(data.variants); } catch (e) {}
    }

    if (files?.coverImage && files.coverImage[0]) {
      try {
        const uploadResult = await this.cloudinaryService.uploadFile(files.coverImage[0]);
        data.imageUrl = uploadResult.secure_url;
      } catch (err) {
        console.error('Failed to upload cover image to Cloudinary:', err);
      }
    }

    // Parse existing/submitted images list if provided
    let updatedImages: string[] | null = null;
    if (data.images !== undefined) {
      if (typeof data.images === 'string') {
        try {
          const parsed = JSON.parse(data.images);
          updatedImages = Array.isArray(parsed) ? parsed : [data.images];
        } catch (e) {
          updatedImages = data.images ? [data.images] : [];
        }
      } else if (Array.isArray(data.images)) {
        updatedImages = [...data.images];
      }
    }

    if (files?.images && files.images.length > 0) {
      if (updatedImages === null) {
        const existing = await this.productModel.findById(id).exec();
        updatedImages = existing?.images ? [...existing.images] : [];
      }
      for (const file of files.images) {
        try {
          const uploadResult = await this.cloudinaryService.uploadFile(file);
          updatedImages.push(uploadResult.secure_url);
        } catch (err) {
          console.error('Failed to upload gallery image to Cloudinary:', err);
        }
      }
    }

    if (updatedImages !== null) {
      data.images = updatedImages;
    }

    const updated = await this.productModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!updated) throw new NotFoundException('Product not found');
    return { success: true, message: 'Product updated', data: updated };
  }

  async deleteProduct(id: string) {
    const deleted = await this.productModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Product not found');
    return { success: true, message: 'Product deleted', data: deleted };
  }

  // ---- CATEGORIES ----
  
  async getCategories() {
    const categories = await this.categoryModel.find().sort({ displayPosition: 1 }).exec();
    return { data: categories };
  }

  async createCategory(data: any, file?: Express.Multer.File) {
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      data.image = uploadResult.secure_url;
      data.heroCover = uploadResult.secure_url;
    }
    if (!data.slug && data.name) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    const newCategory = new this.categoryModel(data);
    await newCategory.save();
    return { success: true, message: 'Category created', data: newCategory };
  }

  async updateCategory(id: string, data: any, file?: Express.Multer.File) {
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      data.image = uploadResult.secure_url;
      data.heroCover = uploadResult.secure_url;
    }
    const updated = await this.categoryModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!updated) throw new NotFoundException('Category not found');
    return { success: true, message: 'Category updated', data: updated };
  }

  async deleteCategory(id: string) {
    const deleted = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Category not found');
    return { success: true, message: 'Category deleted', data: deleted };
  }

  // ---- CUSTOMERS ----
  
  async getCustomersStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const allUsers = await this.userModel.find().exec();
    const total = allUsers.length;
    const newThisMonth = allUsers.filter(u => new Date(u.createdAt) >= firstDayOfMonth).length;
    const active = allUsers.filter(u => u.status === 'Active').length;
    const churned = allUsers.filter(u => u.status === 'Churned').length;

    return { total, newThisMonth, active, churned };
  }

  async getCustomers(query: any) {
    const { page = 1, limit = 10, search = '', status = '' } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const filter: any = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') {
      filter.status = { $regex: `^${status}$`, $options: 'i' };
    }

    const [users, totalUsers] = await Promise.all([
      this.userModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).exec(),
      this.userModel.countDocuments(filter).exec()
    ]);

    // Gather orders to compute LTV and orders count
    const emails = users.map(u => u.email);
    const orders = await this.orderModel.find({ 'customer.email': { $in: emails } }).exec();

    const formattedUsers = users.map(u => {
      const userOrders = orders.filter(o => o.customer.email === u.email);
      const lifetimeValue = userOrders.reduce((sum, o) => sum + o.total, 0);
      return {
        id: u._id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        phone: u.phoneNumber,
        ordersCount: userOrders.length,
        lifetimeValue,
        joinDate: new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      };
    });

    return {
      data: formattedUsers,
      total: totalUsers,
      page: Number(page),
      limit: Number(limit)
    };
  }

  async getCustomerById(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Customer not found');

    const orders = await this.orderModel.find({ 'customer.email': user.email }).sort({ createdAt: -1 }).exec();
    const lifetimeValue = orders.reduce((sum, o) => sum + o.total, 0);

    return {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phoneNumber,
      loyaltyPoints: user.loyaltyPoints,
      tags: user.tags,
      profilePicture: user.profilePicture,
      status: user.status,
      ordersCount: orders.length,
      lifetimeValue,
      orders: orders.map(o => ({
        id: o.orderId,
        products: o.items.map(i => i.name).join(', '),
        status: o.status,
        total: o.total,
        date: new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      }))
    };
  }

  async updateCustomer(id: string, data: any) {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Customer not found');

    if (data.name) {
      const parts = data.name.trim().split(' ');
      user.firstName = parts[0] || user.firstName;
      user.lastName = parts.slice(1).join(' ') || user.lastName;
    }
    if (data.phone) user.phoneNumber = data.phone;
    if (data.status) user.status = data.status;
    if (data.tags) user.tags = Array.isArray(data.tags) ? data.tags : [data.tags];

    await user.save();
    return {
      success: true,
      message: 'Customer updated successfully',
      data: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phoneNumber,
        status: user.status,
      }
    };
  }

  // ---- TRANSACTIONS ----

  async getTransactionsStats() {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const allTxns = await this.transactionModel.find().exec();
    const ytdTxns = allTxns.filter(t => new Date(t.createdAt) >= startOfYear && t.status === 'Successful');
    
    const totalRevenue = ytdTxns.reduce((sum, t) => sum + t.amount, 0);
    const successfulPayments = allTxns.filter(t => t.status === 'Successful').length;
    const failedPayments = allTxns.filter(t => t.status === 'Failed').length;
    const pendingPayments = allTxns.filter(t => t.status === 'Pending').length;

    return { totalRevenue, successfulPayments, failedPayments, pendingPayments };
  }

  async getTransactions(query: any) {
    const { page = 1, limit = 10, search = '', status = '', paymentMethod = '' } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const filter: any = {};
    if (search) {
      filter.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') {
      filter.status = { $regex: `^${status}$`, $options: 'i' };
    }
    if (paymentMethod && paymentMethod !== 'All') {
      filter.paymentMethod = { $regex: `^${paymentMethod}$`, $options: 'i' };
    }

    const [txns, total] = await Promise.all([
      this.transactionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).exec(),
      this.transactionModel.countDocuments(filter).exec()
    ]);

    const formattedTxns = txns.map(t => ({
      id: t.transactionId,
      customer: t.customer.name,
      paymentMethod: t.paymentMethod,
      gateway: t.gateway,
      amount: t.amount,
      status: t.status,
      date: new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    }));

    return {
      data: formattedTxns,
      total,
      page: Number(page),
      limit: Number(limit)
    };
  }

  async getTransactionById(id: string) {
    const txn = await this.transactionModel.findOne({ transactionId: id }).exec();
    if (!txn) throw new NotFoundException('Transaction not found');
    return txn;
  }

  async refundTransaction(id: string) {
    const txn = await this.transactionModel.findOne({ transactionId: id }).exec();
    if (!txn) throw new NotFoundException('Transaction not found');
    txn.status = 'Refunded';
    await txn.save();
    return { success: true, message: 'Transaction refunded successfully', data: txn };
  }

  async updateTransactionStatus(id: string, status: string) {
    const txn = await this.transactionModel.findOne({ transactionId: id }).exec();
    if (!txn) throw new NotFoundException('Transaction not found');
    txn.status = status;
    await txn.save();
    return { success: true, message: `Transaction status updated to ${status}`, data: txn };
  }

  // ---- SETTINGS ----

  async getSettings() {
    let settings = await this.storeSettingsModel.findOne({ settingsId: 'default' }).exec();
    if (!settings) {
      settings = await this.storeSettingsModel.create({ settingsId: 'default' });
    }
    return settings;
  }

  async updateSettings(section: string, data: any) {
    let settings = await this.storeSettingsModel.findOne({ settingsId: 'default' }).exec();
    if (!settings) {
      settings = await this.storeSettingsModel.create({ settingsId: 'default' });
    }
    
    if (section === 'general') {
      const parsedData = { ...data };
      if (parsedData.deliveryFee !== undefined) parsedData.deliveryFee = Number(parsedData.deliveryFee) || 0;
      if (parsedData.serviceFee !== undefined) parsedData.serviceFee = Number(parsedData.serviceFee) || 0;
      if (parsedData.discountCodes !== undefined && Array.isArray(parsedData.discountCodes)) {
        parsedData.discountCodes = parsedData.discountCodes.map((d: any) => ({
          code: String(d.code || '').trim().toUpperCase(),
          percent: Number(d.percent) || 0,
          active: Boolean(d.active),
          description: String(d.description || '').trim()
        })).filter((d: any) => d.code.length > 0 && d.percent > 0);
      }
      settings.general = { ...settings.general, ...parsedData };
    } else if (section === 'security') {
      settings.security = { ...settings.security, ...data };
    } else if (section === 'notification') {
      settings.notification = { ...settings.notification, ...data };
    }

    await settings.save();
    return settings;
  }

  // ---- ANALYTICS ----
  
  async getAnalytics() {
    const allOrders = await this.orderModel.find().exec();
    const allProducts = await this.productModel.find().exec();
    const allCategories = await this.categoryModel.find().exec();

    const validOrders = allOrders.filter(o => o.status !== 'Cancelled');
    const totalOrdersValue = validOrders.length;
    const totalRevenueValue = validOrders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValueValue = totalOrdersValue > 0 ? Math.round(totalRevenueValue / totalOrdersValue) : 0;

    // Revenue over time (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentOrders = validOrders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo);
    
    // Group by Date String
    const revenueMap: Record<string, number> = {};
    recentOrders.forEach(o => {
      const dateKey = new Date(o.createdAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
      revenueMap[dateKey] = (revenueMap[dateKey] || 0) + o.total;
    });

    const revenueOverTime = Object.entries(revenueMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date + ' 2026').getTime() - new Date(b.date + ' 2026').getTime());

    if (revenueOverTime.length === 0) {
      revenueOverTime.push({ date: 'Today', amount: 0 });
    }

    // Product mapping for category and revenue
    const prodNameToCategory: Record<string, string> = {};
    allProducts.forEach(p => {
      const cat = allCategories.find(c => c._id.toString() === p.category?.toString() || c.name === p.category) || { name: 'Uncategorized' };
      prodNameToCategory[p.name] = cat.name;
    });

    const categoryRevenueMap: Record<string, number> = {};
    const productStatsMap: Record<string, { unitsSold: number, revenue: number, category: string }> = {};

    validOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const catName = prodNameToCategory[item.name] || 'Uncategorized';
        const itemRev = (item.price || 0) * (item.quantity || 1);
        
        categoryRevenueMap[catName] = (categoryRevenueMap[catName] || 0) + itemRev;

        if (!productStatsMap[item.name]) {
          productStatsMap[item.name] = { unitsSold: 0, revenue: 0, category: catName };
        }
        productStatsMap[item.name].unitsSold += (item.quantity || 1);
        productStatsMap[item.name].revenue += itemRev;
      });
    });

    // Sales by Category formatting
    const colors = ['#8b181c', '#3b82f6', '#a855f7', '#eab308', '#22c55e', '#654321', '#ff9800'];
    const totalItemRevenue = Object.values(categoryRevenueMap).reduce((sum, v) => sum + v, 0) || 1; // Prevent div by 0
    
    const salesByCategory = Object.entries(categoryRevenueMap)
      .map(([name, rev], idx) => ({
        name,
        percentage: Math.round((rev / totalItemRevenue) * 100),
        color: colors[idx % colors.length]
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Trends
    const calcTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const prevOrders = allOrders.filter(o => o.status !== 'Cancelled' && new Date(o.createdAt) < thirtyDaysAgo && new Date(o.createdAt) >= new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000));
    const prevOrdersValue = prevOrders.length;
    const prevRevenueValue = prevOrders.reduce((sum, o) => sum + o.total, 0);
    const prevAvgOrderValue = prevOrdersValue > 0 ? Math.round(prevRevenueValue / prevOrdersValue) : 0;

    const prevOrdersMap: Record<string, number> = {};
    prevOrders.forEach(o => {
      (o.items || []).forEach(item => {
        prevOrdersMap[item.name] = (prevOrdersMap[item.name] || 0) + (item.quantity || 1);
      });
    });

    // Top Products formatting
    const topProducts = Object.entries(productStatsMap)
      .map(([name, stats]) => ({
        name,
        category: stats.category,
        unitsSold: stats.unitsSold,
        revenue: stats.revenue,
        trend: calcTrend(stats.unitsSold, prevOrdersMap[name] || 0)
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p, index) => ({ ...p, rank: index + 1 }));

    return {
      stats: {
        totalRevenue: { value: totalRevenueValue, trend: calcTrend(totalRevenueValue, prevRevenueValue) },
        totalOrders: { value: totalOrdersValue, trend: calcTrend(totalOrdersValue, prevOrdersValue) },
        avgOrderValue: { value: avgOrderValueValue, trend: calcTrend(avgOrderValueValue, prevAvgOrderValue) }
      },
      revenueOverTime,
      salesByCategory,
      topProducts
    };
  }
}
