import { Controller, Post, Get, Body } from '@nestjs/common';
import { NewsletterService } from './newsletter.service.js';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  async subscribe(@Body() body: { email: string; phone?: string }) {
    return this.newsletterService.subscribe(body.email, body.phone);
  }

  @Get('subscribers')
  async getSubscribers() {
    return this.newsletterService.getAllSubscribers();
  }
}
