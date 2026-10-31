import { Controller, Get, Param, Query, Put, Post, Delete, Body, UseInterceptors, UploadedFiles, UploadedFile } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('orders')
  async getOrders(@Query() query: any) {
    return this.adminService.getOrders(query);
  }

  @Get('orders/:id')
  async getOrderById(@Param('id') id: string) {
    return this.adminService.getOrderById(id);
  }

  @Put('orders/:id/status')
  async updateOrderStatus(@Param('id') id: string, @Body() body: { status: string, notes?: string }) {
    return this.adminService.updateOrderStatus(id, body.status, body.notes);
  }

  @Post('orders/:id/verify-pin')
  async verifyOrderPin(@Param('id') id: string, @Body() body: { pin: string, receivedBy?: string }) {
    return this.adminService.verifyOrderPin(id, body.pin, body.receivedBy);
  }

  // PRODUCTS
  @Get('products/stats')
  async getProductsStats() {
    return this.adminService.getProductsStats();
  }

  @Get('products')
  async getProducts(@Query() query: any) {
    return this.adminService.getProducts(query);
  }

  @Get('products/:id')
  async getProductById(@Param('id') id: string) {
    return this.adminService.getProductById(id);
  }

  @Post('products')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'coverImage', maxCount: 1 },
    { name: 'images', maxCount: 5 }
  ]))
  async createProduct(@Body() body: any, @UploadedFiles() files: { coverImage?: Express.Multer.File[], images?: Express.Multer.File[] }) {
    return this.adminService.createProduct(body, files);
  }

  @Put('products/:id')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'coverImage', maxCount: 1 },
    { name: 'images', maxCount: 5 }
  ]))
  async updateProduct(@Param('id') id: string, @Body() body: any, @UploadedFiles() files: { coverImage?: Express.Multer.File[], images?: Express.Multer.File[] }) {
    return this.adminService.updateProduct(id, body, files);
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id);
  }

  // CATEGORIES
  @Get('categories')
  async getCategories() {
    return this.adminService.getCategories();
  }

  @Post('categories')
  @UseInterceptors(FileInterceptor('image'))
  async createCategory(@Body() body: any, @UploadedFile() file: Express.Multer.File) {
    return this.adminService.createCategory(body, file);
  }

  @Put('categories/:id')
  @UseInterceptors(FileInterceptor('image'))
  async updateCategory(@Param('id') id: string, @Body() body: any, @UploadedFile() file: Express.Multer.File) {
    return this.adminService.updateCategory(id, body, file);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  // CUSTOMERS
  @Get('customers/stats')
  async getCustomersStats() {
    return this.adminService.getCustomersStats();
  }

  @Get('customers')
  async getCustomers(@Query() query: any) {
    return this.adminService.getCustomers(query);
  }

  @Get('customers/:id')
  async getCustomerById(@Param('id') id: string) {
    return this.adminService.getCustomerById(id);
  }

  @Put('customers/:id')
  async updateCustomer(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateCustomer(id, body);
  }

  // TRANSACTIONS
  @Get('transactions/stats')
  async getTransactionsStats() {
    return this.adminService.getTransactionsStats();
  }

  @Get('transactions')
  async getTransactions(@Query() query: any) {
    return this.adminService.getTransactions(query);
  }

  @Get('transactions/:id')
  async getTransactionById(@Param('id') id: string) {
    return this.adminService.getTransactionById(id);
  }

  @Put('transactions/:id/refund')
  async refundTransaction(@Param('id') id: string) {
    return this.adminService.refundTransaction(id);
  }

  @Put('transactions/:id/status')
  async updateTransactionStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.adminService.updateTransactionStatus(id, body.status);
  }

  // SETTINGS
  @Get('settings')
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings/:section')
  async updateSettings(@Param('section') section: string, @Body() data: any) {
    return this.adminService.updateSettings(section, data);
  }

  // ANALYTICS
  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }
}
