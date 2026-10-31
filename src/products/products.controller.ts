import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @UseGuards(AdminGuard)
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(@Body() createProductDto: any, @UploadedFile() file: Express.Multer.File) {
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      createProductDto.imageUrl = uploadResult.secure_url;
    }
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: any) {
    return this.productsService.update(id, updateProductDto);
  }

  @Post('review')
  submitGeneralReview(@Body() reviewDto: any) {
    return this.productsService.addReview('general', reviewDto);
  }

  @Post(':id/review')
  addReview(@Param('id') id: string, @Body() reviewDto: any) {
    return this.productsService.addReview(id, reviewDto);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
