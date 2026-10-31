import { Controller, Post, Get, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: any) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: any) {
    return this.authService.login(loginDto);
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() loginDto: any) {
    return this.authService.adminLogin(loginDto);
  }

  @Get('admin/verify')
  async verifyAdmin(@Headers('authorization') authHeader?: string) {
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : '';
    return this.authService.verifyAdminToken(token);
  }

  @Post('admin/change-password')
  @HttpCode(HttpStatus.OK)
  async changeAdminPassword(
    @Body() body: { currentPassword?: string; newPassword?: string; email?: string },
    @Headers('authorization') authHeader?: string,
  ) {
    let emailOrId = body.email || '';
    if (!emailOrId && authHeader) {
      try {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const verified = await this.authService.verifyAdminToken(token);
        emailOrId = verified?.user?.id ? String(verified.user.id) : (verified?.user?.email || '');
      } catch {}
    }
    return this.authService.changeAdminPassword(emailOrId, body.currentPassword || '', body.newPassword || '');
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() emailDto: any) {
    return this.authService.forgotPassword(emailDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetDto: any) {
    return this.authService.resetPassword(resetDto);
  }
}
