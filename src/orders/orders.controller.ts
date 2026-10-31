import { Controller, Post, Body, Get, Query, Param } from '@nestjs/common';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  async checkout(@Body() orderData: any) {
    return this.ordersService.checkout(orderData);
  }

  @Get('verify')
  async verifyPayment(
    @Query('transaction_id') transactionId: string,
    @Query('orderId') orderId?: string
  ) {
    return this.ordersService.verifyPayment(transactionId, orderId);
  }

  @Get('config')
  async getStoreConfig() {
    return this.ordersService.getStoreConfig();
  }

  @Get()
  async findAll(@Query() query: any) {
    return this.ordersService.findAll(query);
  }

  @Get(':id/track')
  async trackOrder(@Param('id') id: string) {
    return this.ordersService.getOrderTracking(id);
  }

  @Post(':id/confirm-delivery')
  async confirmDelivery(
    @Param('id') id: string,
    @Body('deliveryPin') deliveryPin: string,
    @Body('receivedBy') receivedBy?: string
  ) {
    return this.ordersService.confirmDeliveryWithPin(id, deliveryPin, receivedBy);
  }

  @Post(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    return this.ordersService.updateStatus(id, status);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }
}
