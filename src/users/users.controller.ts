import { Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';
import { AdminGuard } from '../auth/admin.guard.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get('addresses')
  getAddresses(@Query('userId') userId?: string) {
    return this.usersService.getAddresses(userId);
  }

  @Post('addresses')
  addAddress(@Body() addressData: any, @Query('userId') userId?: string) {
    return this.usersService.addAddress(userId, addressData);
  }

  @Put('addresses/:id')
  updateAddress(@Param('id') id: string, @Body() addressData: any, @Query('userId') userId?: string) {
    return this.usersService.updateAddress(userId, id, addressData);
  }

  @Delete('addresses/:id')
  deleteAddress(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.usersService.deleteAddress(userId, id);
  }

  @UseGuards(AdminGuard)
  @Patch(':id/role')
  async updateRole(@Param('id') id: string, @Body('role') role: string) {
    return this.usersService.updateRole(id, role);
  }
}