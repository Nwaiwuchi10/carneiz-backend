import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/user.entity.js';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader) throw new UnauthorizedException('Missing token');

    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const user = await this.userModel.findById(decoded.sub);
      if (!user) throw new UnauthorizedException('User not found');
      if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
      
      request.user = user;
      return true;
    } catch (e) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
