import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { AdminGuard } from '../auth/admin.guard.js';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProductsService = {
    create: vi.fn((dto) => {
      return { _id: '1', ...dto };
    }),
    findAll: vi.fn(() => {
      return { data: [{ _id: '1', name: 'Beef' }], total: 1, page: 1, lastPage: 1 };
    }),
    findOne: vi.fn((id) => {
      return { _id: id, name: 'Beef' };
    }),
    update: vi.fn((id, dto) => {
      return { _id: id, ...dto };
    }),
    remove: vi.fn((id) => {
      return { _id: id, name: 'Beef' };
    }),
  };

  const mockAdminGuard = {
    canActivate: vi.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue(mockAdminGuard)
      .compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a product', async () => {
    const dto = { name: 'Goat Meat', price: 9000, category: 'Goat', weight: '1.0 kg', imageUrl: 'goat.jpg', description: 'Fresh' };
    const result = await controller.create(dto, null as any);
    expect(result).toEqual({ _id: '1', ...dto });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should get all products with pagination and search', async () => {
    const query = { search: 'Beef', page: 1, limit: 10 };
    const result = await controller.findAll(query);
    expect(result).toEqual({ data: [{ _id: '1', name: 'Beef' }], total: 1, page: 1, lastPage: 1 });
    expect(service.findAll).toHaveBeenCalledWith(query);
  });
});
