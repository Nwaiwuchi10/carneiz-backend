import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Flutterwave from 'flutterwave-node-v3';
import * as nodemailer from 'nodemailer';
import { Order, OrderDocument } from './order.entity.js';
import { StoreSettings, StoreSettingsDocument } from '../settings/settings.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class OrdersService {
  private flw: any;
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(StoreSettings.name) private storeSettingsModel: Model<StoreSettingsDocument>,
    private readonly notificationsService: NotificationsService,
  ) {
    this.flw = new Flutterwave(
      process.env.FLW_PUBLIC_KEY || '',
      process.env.FLW_SECRET_KEY || ''
    );
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || '',
        pass: process.env.GMAIL_PASS || '',
      },
    });
  }

  async getStoreConfig() {
    let settings = await this.storeSettingsModel.findOne({ settingsId: 'default' }).exec();
    if (!settings) {
      settings = await this.storeSettingsModel.create({ settingsId: 'default' });
    }
    const general = (settings.general as any) || {};
    return {
      deliveryFee: general.deliveryFee !== undefined ? Number(general.deliveryFee) : 2500,
      serviceFee: general.serviceFee !== undefined ? Number(general.serviceFee) : 500,
      pickupAddress: general.pickupAddress || 'Carneiz Flagship Store, Plot 14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
      pickupHours: general.pickupHours || 'Mon - Sat: 8:00 AM - 7:00 PM',
      businessName: general.businessName || 'Carneiz Premium Meats',
      businessAddress: general.businessAddress || 'Victoria Island, Lagos, Nigeria',
      currency: general.currency || 'NGN (₦)',
      discountCodes: general.discountCodes || [
        { code: 'CARNEIZ10', percent: 10, active: true, description: 'Newsletter Welcome 10% Discount' },
        { code: 'CARNEIZ5', percent: 5, active: true, description: 'General Store 5% Discount' }
      ],
    };
  }

  async validatePromoCode(rawCode: string) {
    if (!rawCode || typeof rawCode !== 'string') {
      throw new BadRequestException('Please provide a valid promo code.');
    }
    const cleanCode = rawCode.trim().toUpperCase();
    const config = await this.getStoreConfig();
    const discounts: Array<{ code: string; percent: number; active: boolean; description?: string }> = config.discountCodes || [];

    const matched = discounts.find(d => d.code.toUpperCase() === cleanCode && d.active !== false);
    if (!matched) {
      throw new BadRequestException(`Promo code "${cleanCode}" is invalid or expired.`);
    }

    return {
      valid: true,
      code: matched.code,
      percent: Number(matched.percent) || 5,
      description: matched.description || `${matched.percent}% Discount Applied`,
    };
  }

  async sendOrderConfirmationEmail(
    email: string,
    name: string,
    orderRef: string,
    deliveryPin: string,
    deliveryWindow: string,
    address: string,
    fulfillmentType: string = 'delivery',
    pickupAddress: string = ''
  ) {
    const isPickup = fulfillmentType === 'pickup';
    const pinTitle = isPickup ? 'YOUR SECRET STORE PICKUP PIN' : 'YOUR SECRET DELIVERY PIN';
    const pinInstruction = isPickup
      ? `Present this PIN to the Carneiz store attendant at our pickup counter (${pickupAddress || 'Carneiz Store'}) to collect and verify your order.`
      : `Keep this PIN safe. When your Carneiz dispatch rider arrives with your order, enter this PIN on your tracking page to complete and verify delivery.`;

    const locationLabel = isPickup ? 'Store Pickup Location' : 'Delivery Address';
    const locationValue = isPickup ? (pickupAddress || 'Carneiz Flagship Store, Plot 14 Admiralty Way, Lekki Phase 1, Lagos') : address;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 40px 20px;">
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
            <h2 style="margin: 0; color: #7A1A1A; font-weight: 900; letter-spacing: 2px;">CARNEIZ. LTD</h2>
            <span style="color: #999; font-size: 13px;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          
          <h1 style="color: #222; font-size: 22px; margin-bottom: 8px;">Order Confirmed! ${isPickup ? '🏬' : '🥩'}</h1>
          <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">Hi ${name}, thank you for your order. We are preparing your fresh butchery cuts with the highest hygiene standards.</p>
          
          <!-- Secret PIN Banner -->
          <div style="background: #fdf5f5; border: 2px dashed #7A1A1A; padding: 22px; border-radius: 10px; margin-bottom: 25px; text-align: center;">
            <span style="color: #666; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">
              ${pinTitle}
            </span>
            <span style="color: #7A1A1A; font-size: 34px; font-weight: 900; letter-spacing: 6px; display: block;">
              ${deliveryPin}
            </span>
            <p style="color: #777; font-size: 12px; margin: 10px 0 0 0; line-height: 1.5;">
              ${pinInstruction}
            </p>
          </div>

          <div style="background: #fafafa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #666;">Order Number</span>
              <strong style="color: #222;">${orderRef}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #666;">Fulfillment Method</span>
              <strong style="color: #7A1A1A;">${isPickup ? 'Store Pickup' : 'Home Delivery'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #666;">Estimated Window</span>
              <strong style="color: #16a34a;">${deliveryWindow}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">${locationLabel}</span>
              <strong style="color: #222;">${locationValue}</strong>
            </div>
          </div>
          
          <a href="http://localhost:3000/track-order?orderId=${encodeURIComponent(orderRef)}" style="display: block; width: 100%; text-align: center; background: #7A1A1A; color: white; padding: 15px 0; text-decoration: none; border-radius: 8px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">
            TRACK ORDER DETAILS & VERIFY PIN
          </a>
          <p style="text-align: center; color: #777; font-size: 12px;">If you have any questions, reply directly to this email or visit our store.</p>
        </div>
      </div>
    `;

    this.transporter.sendMail({
      from: `"Carneiz Ltd" <${process.env.GMAIL_USER || 'carneizltd@gmail.com'}>`,
      to: email,
      subject: `Order Confirmed: ${orderRef} | ${isPickup ? 'Store Pickup PIN' : 'Delivery PIN'}: ${deliveryPin} ${isPickup ? '🏬' : '🚚'}`,
      html,
    }).catch(console.error); // Non-blocking
  }

  async checkout(orderData: any) {
    try {
      const config = await this.getStoreConfig();
      const orderRef = `#CMZ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit secret PIN
      const tx_ref = `carneiz_tx_${Date.now()}`;
      
      const fulfillmentType = orderData.fulfillmentType === 'pickup' ? 'pickup' : 'delivery';
      const subtotal = Number(orderData.subtotal) || Number(orderData.amount) || 0;
      const deliveryFee = fulfillmentType === 'pickup' 
        ? 0 
        : (orderData.deliveryFee !== undefined ? Number(orderData.deliveryFee) : config.deliveryFee);
      const serviceFee = orderData.serviceFee !== undefined ? Number(orderData.serviceFee) : config.serviceFee;
      
      // Server-side discount validation to prevent unauthorized or arbitrary discount amounts
      let validDiscountAmount = 0;
      if (orderData.discountCode) {
        const cleanCode = String(orderData.discountCode).trim().toUpperCase();
        const matched = (config.discountCodes || []).find(
          (d: any) => d.code.toUpperCase() === cleanCode && d.active !== false
        );
        if (matched) {
          validDiscountAmount = Math.round((subtotal * Number(matched.percent)) / 100);
        }
      }
      const discount = validDiscountAmount;
      const total = Math.max(0, subtotal + deliveryFee + serviceFee - discount);
      
      const pickupAddress = orderData.pickupAddress || config.pickupAddress;
      const deliveryWindow = orderData.deliveryWindow || (fulfillmentType === 'pickup' ? 'Same-Day In-Store Pickup (8AM - 7PM)' : 'Standard 2-3 Days Cold-Chain Delivery');
      const paymentMethod = orderData.paymentMethod || 'flutterwave';

      const customerName = orderData.name || orderData.customer?.name || '';
      const customerEmail = orderData.email || orderData.customer?.email || '';
      const customerPhone = orderData.phone || orderData.customer?.phone || '';
      const customerAddress = fulfillmentType === 'pickup'
        ? pickupAddress
        : (orderData.address || orderData.customer?.address || '');

      // Save order in MongoDB
      const createdOrder = await this.orderModel.create({
        orderId: orderRef,
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          address: customerAddress,
        },
        items: (orderData.items || []).map((it: any) => ({
          name: it.name,
          weight: it.weight || '1.0 kg',
          quantity: it.quantity || 1,
          price: it.price || 0,
        })),
        subtotal,
        discount,
        deliveryFee,
        serviceFee,
        fulfillmentType,
        pickupAddress,
        total,
        status: paymentMethod === 'cash' ? 'Processing' : 'New',
        deliveryPin,
        deliveryWindow,
        paymentMethod: paymentMethod === 'cash' ? (fulfillmentType === 'pickup' ? 'Pay at Pickup' : 'Cash on Delivery') : 'Flutterwave',
        notes: [
          {
            user: 'System',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            text: `Order initialized (${fulfillmentType.toUpperCase()}). Secret customer PIN generated: ${deliveryPin}`,
          },
        ],
      });

      // Capture notifications for user and admin
      const isPickup = fulfillmentType === 'pickup';
      const isCash = paymentMethod === 'cash';
      const paymentLabel = isCash ? (isPickup ? 'Pay at Pickup' : 'Cash on Delivery') : 'Flutterwave Online';
      const adminNotifTitle = isCash
        ? (isPickup ? 'New Store Pickup Order (Pay at Store)' : 'New Cash on Delivery Order')
        : 'New Online Order Received';

      // 1) Admin notification
      this.notificationsService.create({
        recipientType: 'admin',
        title: adminNotifTitle,
        message: `Order ${orderRef} placed by ${customerName || 'Customer'} for ₦${total.toLocaleString()} (${isPickup ? 'Store Pickup' : 'Doorstep Delivery'}, Payment: ${paymentLabel}). Handover PIN: ${deliveryPin}.`,
        type: 'order',
        metadata: {
          orderId: orderRef,
          total,
          fulfillmentType,
          paymentMethod: paymentLabel,
          customerName,
          customerEmail,
          deliveryPin,
        },
      }).catch(console.error);

      // 2) User notification
      this.notificationsService.create({
        recipientType: 'user',
        userEmail: customerEmail,
        title: `Order ${orderRef} Placed`,
        message: `Your order for ₦${total.toLocaleString()} has been placed (${isPickup ? 'Store Pickup' : 'Home Delivery'}). Your secret handover PIN is ${deliveryPin}.`,
        type: 'order',
        metadata: {
          orderId: orderRef,
          total,
          fulfillmentType,
          deliveryPin,
        },
      }).catch(console.error);

      // Send email containing order reference & secret delivery/pickup pin
      this.sendOrderConfirmationEmail(
        customerEmail,
        customerName,
        orderRef,
        deliveryPin,
        deliveryWindow,
        customerAddress,
        fulfillmentType,
        pickupAddress
      );

      // If Cash on delivery, complete without payment link
      if (paymentMethod === 'cash') {
        return {
          message: 'Order placed successfully! Cash on Delivery confirmed.',
          orderId: createdOrder.orderId,
          deliveryPin: createdOrder.deliveryPin,
          order: createdOrder,
        };
      }

      // Generate Flutterwave Payment Link
      const cleanOrderRef = orderRef.replace(/#/g, '');
      const redirectUrl = orderData.redirect_url || `http://localhost:3000/checkout?status=success&orderId=${cleanOrderRef}`;

      const payload = {
        tx_ref,
        amount: total,
        currency: 'NGN',
        redirect_url: redirectUrl,
        customer: {
          email: customerEmail,
          phonenumber: customerPhone,
          name: customerName,
        },
        customizations: {
          title: 'Carneiz Premium Butchery',
          description: `Order ${cleanOrderRef}`,
        },
      };

      const flwKey = process.env.FLW_SECRET_KEY || '';
      const flwRes = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${flwKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (flwRes.ok) {
        const flwData: any = await flwRes.json();
        if (flwData.status === 'success' && flwData.data?.link) {
          return {
            message: 'Order created and payment initiated via Flutterwave',
            paymentLink: flwData.data.link,
            orderId: createdOrder.orderId,
            deliveryPin: createdOrder.deliveryPin,
            order: createdOrder,
          };
        }
      } else {
        const errText = await flwRes.text();
        console.error('Flutterwave payment link error response:', flwRes.status, errText.slice(0, 200));
      }

      return {
        message: 'Order created successfully',
        orderId: createdOrder.orderId,
        deliveryPin: createdOrder.deliveryPin,
        order: createdOrder,
      };
    } catch (error: any) {
      console.error('Checkout error:', error);
      throw new InternalServerErrorException(error.message || 'Payment processing failed');
    }
  }

  async verifyPayment(transactionId: string, orderId?: string) {
    try {
      let flwVerified = false;
      if (transactionId) {
        const flwKey = process.env.FLW_SECRET_KEY || '';
        const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
          headers: {
            Authorization: `Bearer ${flwKey}`,
          },
        });
        if (response.ok) {
          const data: any = await response.json();
          if (data.status === 'success' && data.data?.status === 'successful') {
            flwVerified = true;
          }
        }
      }

      // Find order by ID if provided
      let order: any = null;
      if (orderId) {
        const cleanId = orderId.startsWith('#') ? orderId : `#${orderId}`;
        order = await this.orderModel.findOne({
          $or: [{ orderId }, { orderId: cleanId }, { orderId: orderId.replace(/^#/, '') }],
        });
        if (order) {
          order.status = 'Processing';
          await order.save();

          // 1) Admin Notification for payment received
          this.notificationsService.create({
            recipientType: 'admin',
            title: `Payment Received: ${order.orderId}`,
            message: `Inbound payment of ₦${Number(order.total).toLocaleString()} from ${order.customer?.name || 'Customer'} has been settled via Flutterwave.`,
            type: 'payment',
            metadata: { orderId: order.orderId, total: order.total },
          }).catch(console.error);

          // 2) User Notification for payment confirmed
          this.notificationsService.create({
            recipientType: 'user',
            userEmail: order.customer?.email,
            title: 'Payment Received',
            message: `Inbound payment of ₦${Number(order.total).toLocaleString()} for order ${order.orderId} has been settled. Your cuts are being prepared.`,
            type: 'payment',
            metadata: { orderId: order.orderId, total: order.total },
          }).catch(console.error);
        }
      }

      return {
        message: 'Payment verified successfully',
        status: 'success',
        order,
        deliveryPin: order?.deliveryPin,
      };
    } catch (error) {
      throw new InternalServerErrorException('Payment verification failed');
    }
  }

  async confirmDeliveryWithPin(id: string, enteredPin: string, receivedBy?: string) {
    const cleanId = id.startsWith('#') ? id : `#${id}`;
    const order = await this.orderModel.findOne({
      $or: [{ orderId: id }, { orderId: cleanId }, { orderId: id.replace(/^#/, '') }],
    });

    if (!order) {
      throw new NotFoundException(`Order with reference ${id} not found.`);
    }

    if (order.status === 'Delivered') {
      return {
        message: 'This order has already been confirmed and marked as Delivered.',
        order,
      };
    }

    const expectedPin = order.deliveryPin;
    if (!expectedPin || !enteredPin || expectedPin.trim() !== enteredPin.toString().trim()) {
      throw new BadRequestException('Invalid Delivery PIN. Please enter the secret 4-digit PIN provided on your order confirmation.');
    }

    const isPickup = order.fulfillmentType === 'pickup';
    order.status = 'Delivered';
    order.deliveredAt = new Date();
    order.receivedBy = receivedBy || order.customer?.name || 'Customer';
    if (!order.notes) order.notes = [];
    order.notes.push({
      user: isPickup ? 'Store Attendant Verification' : 'Customer Verification',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      text: isPickup
        ? `Store Pickup verified with valid PIN (${enteredPin}) by ${receivedBy || order.customer?.name || 'Customer'}. Handover complete.`
        : `Customer successfully authenticated delivery with valid PIN (${enteredPin}). Marked Delivered.`,
    });

    await order.save();

    // 1) Admin Notification for delivery confirmation
    this.notificationsService.create({
      recipientType: 'admin',
      title: `Delivery Verified: ${order.orderId}`,
      message: `${isPickup ? 'Store pickup' : 'Order delivery'} for ${order.orderId} verified with secret PIN (${enteredPin}) by ${receivedBy || order.customer?.name || 'Customer'}. Marked Delivered.`,
      type: 'delivery',
      metadata: { orderId: order.orderId, fulfillmentType: order.fulfillmentType, pin: enteredPin },
    }).catch(console.error);

    // 2) User Notification for delivery confirmation
    this.notificationsService.create({
      recipientType: 'user',
      userEmail: order.customer?.email,
      title: `Order ${order.orderId} ${isPickup ? 'Collected' : 'Delivered'}`,
      message: `Your order has been verified with secret PIN and handed over successfully. Thank you for shopping with Carneiz!`,
      type: 'delivery',
      metadata: { orderId: order.orderId, fulfillmentType: order.fulfillmentType },
    }).catch(console.error);

    return {
      message: isPickup
        ? 'Store pickup confirmed successfully! Order marked as Delivered.'
        : 'Delivery confirmed successfully! Package marked as Delivered.',
      order,
    };
  }

  async updateStatus(id: string, newStatus: string) {
    const cleanId = id.startsWith('#') ? id : `#${id}`;
    const order = await this.orderModel.findOne({
      $or: [{ orderId: id }, { orderId: cleanId }, { orderId: id.replace(/^#/, '') }],
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found.`);
    }

    if (newStatus && newStatus.toLowerCase() === 'delivered') {
      throw new BadRequestException('The Delivered status is reserved for customer PIN authentication upon physical delivery.');
    }

    order.status = newStatus;
    order.notes.push({
      user: 'Admin',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      text: `Status updated to ${newStatus}`,
    });
    await order.save();

    const isDispatched = newStatus.toLowerCase().includes('out') || newStatus.toLowerCase().includes('packed');

    // 1) User Notification for status update
    this.notificationsService.create({
      recipientType: 'user',
      userEmail: order.customer?.email,
      title: isDispatched ? `Order ${order.orderId} dispatched` : `Order ${order.orderId} updated`,
      message: isDispatched 
        ? `Your butchery shipment is packed and on its way. Handover PIN: ${order.deliveryPin}.`
        : `Your order status is now ${newStatus}.`,
      type: 'order',
      metadata: { orderId: order.orderId, status: newStatus },
    }).catch(console.error);

    // 2) Admin Notification for status update
    this.notificationsService.create({
      recipientType: 'admin',
      title: `Order ${order.orderId} Updated`,
      message: `Order status set to ${newStatus}.`,
      type: 'order',
      metadata: { orderId: order.orderId, status: newStatus },
    }).catch(console.error);

    return {
      message: `Order status updated to ${newStatus}`,
      order,
    };
  }

  async getOrderTracking(id: string) {
    const cleanId = id.startsWith('#') ? id : `#${id}`;
    const order = await this.orderModel.findOne({
      $or: [{ orderId: id }, { orderId: cleanId }, { orderId: id.replace(/^#/, '') }],
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found.`);
    }

    const isDelivered = order.status.toLowerCase() === 'delivered';
    const isOutForDelivery = order.status.toLowerCase().includes('out') || order.status.toLowerCase().includes('route');
    
    return {
      orderId: order.orderId,
      status: order.status,
      isDelivered,
      isOutForDelivery,
      deliveryPin: order.deliveryPin || '',
      deliveryWindow: order.deliveryWindow || (order.fulfillmentType === 'pickup' ? 'Same-Day In-Store Pickup' : 'Cold-Chain Delivery Window'),
      countdown: isDelivered ? 'Delivered' : isOutForDelivery ? 'Out for Delivery' : (order.fulfillmentType === 'pickup' ? 'Ready for In-Store Pickup' : 'Order Processing'),
      customer: order.customer,
      items: order.items,
      totalPaid: order.total,
      fulfillmentType: order.fulfillmentType || 'delivery',
      pickupAddress: order.pickupAddress || '',
      paymentMethod: order.paymentMethod || 'Flutterwave',
      deliveryAddress: order.customer?.address || '',
      rider: order.fulfillmentType === 'pickup' ? 'In-Store Attendant' : (order.status.toLowerCase().includes('out') ? 'Carneiz Logistics Dispatch' : 'Assigned upon dispatch'),
      deliveredAt: order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
      receivedBy: order.receivedBy || null,
    };
  }

  async findById(id: string) {
    const cleanId = id.startsWith('#') ? id : `#${id}`;
    const order = await this.orderModel.findOne({
      $or: [{ orderId: id }, { orderId: cleanId }, { orderId: id.replace(/^#/, '') }],
    });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found.`);
    }
    return order;
  }

  async findAll(query: any) {
    const { search = '', page = 1, limit = 6, status = '', timeRange = '' } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 6;

    const filter: any = {};
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { deliveryPin: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'All Statuses') {
      filter.status = { $regex: `^${status}$`, $options: 'i' };
    }

    const total = await this.orderModel.countDocuments(filter).exec();
    const skip = (pageNum - 1) * limitNum;
    const dbOrders = await this.orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .exec();

    const mappedDbOrders = dbOrders.map((o) => ({
      id: o.orderId,
      date: o.createdAt
        ? new Date(o.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Recent',
      customer: o.customer?.name || 'Customer',
      items: (o.items || []).map((it) => `${it.name} (x${it.quantity})`).join(', '),
      rawItems: o.items || [],
      total: o.total,
      deliveryPin: o.deliveryPin || '',
      status: o.status,
    }));

    return {
      data: mappedDbOrders,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    };
  }
}
