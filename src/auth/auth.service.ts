import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/user.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly notificationsService: NotificationsService,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'test@gmail.com',
        pass: process.env.GMAIL_PASS || 'password',
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    // Non-blocking email sending
    this.transporter.sendMail({
      from: `"Carneiz Ltd" <${process.env.GMAIL_USER || 'carneizltd@gmail.com'}>`,
      to,
      subject,
      html,
    }).catch(console.error);
  }

  async register(registerDto: any) {
    const { firstName, lastName, email, phoneNumber, password } = registerDto;
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new this.userModel({
      firstName,
      lastName,
      email,
      phoneNumber,
      password: hashedPassword,
    });
    await user.save();

    // 1) User Welcome Notification
    this.notificationsService.create({
      recipientType: 'user',
      userId: user._id.toString(),
      userEmail: email,
      title: 'Welcome to Carneiz!',
      message: `Hi ${firstName}, welcome to Carneiz! Your account has been created. Explore our cuts and track your butcher-fresh orders easily.`,
      type: 'account',
      metadata: { userId: user._id.toString(), name: `${firstName} ${lastName}`, email },
    }).catch(console.error);

    // 2) Admin Notification for New Customer
    this.notificationsService.create({
      recipientType: 'admin',
      title: 'New Customer Registered',
      message: `${firstName} ${lastName} (${email}) just signed up for a Carneiz account.`,
      type: 'account',
      metadata: { userId: user._id.toString(), name: `${firstName} ${lastName}`, email, phone: phoneNumber },
    }).catch(console.error);

    this.sendEmail(
      email,
      'Welcome to Carneiz!',
      `<h1>Welcome ${firstName}!</h1><p>Your account has been created successfully.</p>`
    );

    return {
      message: 'User registered successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    };
  }

  async login(loginDto: any) {
    const { email, password } = loginDto;
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = jwt.sign({ sub: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

    // User Login Notification
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    this.notificationsService.create({
      recipientType: 'user',
      userId: user._id.toString(),
      userEmail: email,
      title: 'New Login Detected',
      message: `Hi ${user.firstName}, a successful login was recorded on your account at ${timeStr}.`,
      type: 'auth',
      metadata: { userId: user._id.toString(), email },
    }).catch(console.error);

    this.sendEmail(
      email,
      'New Login Detected',
      `<h1>Hello ${user.firstName}!</h1><p>A new login was detected on your account.</p>`
    );

    return {
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    };
  }

  async adminLogin(loginDto: any) {
    const { email, password } = loginDto;
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    const user = await this.userModel.findOne({ email: cleanEmail });
    if (!user) {
      throw new UnauthorizedException('Invalid administrative credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid administrative credentials');
    }

    if (user.role !== 'admin') {
      throw new UnauthorizedException('Access denied. Administrator privileges required.');
    }

    const token = jwt.sign(
      { sub: user._id, role: 'admin' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' },
    );

    // Record an admin console login audit alert
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    this.notificationsService.create({
      recipientType: 'admin',
      title: 'Admin Console Login',
      message: `${user.firstName} ${user.lastName} (${user.email}) accessed the Single Admin Console at ${timeStr}.`,
      type: 'account',
      metadata: { adminId: user._id.toString(), email: user.email },
    }).catch(console.error);

    return {
      message: 'Admin authentication successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    };
  }

  async verifyAdminToken(token: string) {
    try {
      const payload: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const user = await this.userModel.findById(payload.sub);
      if (!user || user.role !== 'admin') {
        throw new UnauthorizedException('Unauthorized administrator session');
      }
      return {
        valid: true,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired admin session');
    }
  }

  async changeAdminPassword(adminIdOrEmail: string, currentPass: string, newPass: string) {
    let user = null;
    if (adminIdOrEmail && /^[0-9a-fA-F]{24}$/.test(adminIdOrEmail)) {
      user = await this.userModel.findById(adminIdOrEmail).exec();
    }
    if (!user && adminIdOrEmail) {
      user = await this.userModel.findOne({ email: adminIdOrEmail.toLowerCase().trim() }).exec();
    }
    if (!user) {
      throw new UnauthorizedException('Admin account not found');
    }

    const isMatch = await bcrypt.compare(currentPass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Current password does not match');
    }

    user.password = await bcrypt.hash(newPass, 10);
    await user.save();
    return { success: true, message: 'Password updated successfully' };
  }

  async forgotPassword(emailDto: any) {
    const { email } = emailDto;
    const user = await this.userModel.findOne({ email });
    if (user) {
      // In production, generate a secure token here and save it to the user.
      const resetToken = jwt.sign({ sub: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
      const resetLink = `http://localhost:3001/reset-password?token=\${resetToken}&email=\${email}`;
      this.sendEmail(
        email,
        'Password Reset Request',
        `<h1>Password Reset</h1><p>Click the link below to reset your password.</p><a href="\${resetLink}">Reset Password</a>`
      );
    }
    return { message: 'If that email is in our system, we have sent a password reset link.' };
  }

  async resetPassword(resetDto: any) {
    const { email, token, newPassword } = resetDto;
    try {
      // Verify token
      jwt.verify(token, process.env.JWT_SECRET || 'secret');
      
      const user = await this.userModel.findOne({ email });
      if (!user) throw new UnauthorizedException('Invalid or expired token');

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      this.sendEmail(
        email,
        'Password Reset Successful',
        `<h1>Success</h1><p>Your password has been successfully reset.</p>`
      );

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
