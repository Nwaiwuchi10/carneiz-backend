import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { Order } from '../orders/order.entity.js';
import { Product } from '../products/product.entity.js';
import { Category } from '../products/category.entity.js';
import { User } from '../users/user.entity.js';
import { Transaction } from '../transactions/transaction.entity.js';
import { StoreSettings } from '../settings/settings.entity.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { vi } from 'vitest';

const mockOrder = {
  orderId: 'CRN-DEMO042',
  customer: { name: 'Adaeze Okafor' },
  items: [{ name: 'Fresh Goat Meat', price: 29000 }],
  subtotal: 54500,
  deliveryFee: 2500,
  total: 57000,
  status: 'Packed',
  notes: [],
  createdAt: new Date(),
  save: vi.fn().mockResolvedValue(true)
};

describe('AdminController', () => {
  let controller: AdminController;

  const mockOrderModel = {
    find: vi.fn(() => ({
      sort: vi.fn(() => ({
        skip: vi.fn(() => ({
          limit: vi.fn(() => ({
            exec: vi.fn().mockResolvedValue([mockOrder])
          }))
        }))
      })),
      exec: vi.fn().mockResolvedValue([mockOrder])
    })),
    findOne: vi.fn(() => ({
      exec: vi.fn().mockResolvedValue(mockOrder)
    })),
    countDocuments: vi.fn(() => ({
      exec: vi.fn().mockResolvedValue(1)
    }))
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        AdminService,
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel
        },
        {
          provide: getModelToken(Product.name),
          useValue: mockOrderModel // Reusing for tests since we only test order stuff here for now, or just provide empty mock
        },
        {
          provide: getModelToken(Category.name),
          useValue: mockOrderModel
        },
        {
          provide: getModelToken(User.name),
          useValue: mockOrderModel
        },
        {
          provide: getModelToken(Transaction.name),
          useValue: mockOrderModel
        },
        {
          provide: getModelToken(StoreSettings.name),
          useValue: mockOrderModel
        },
        {
          provide: CloudinaryService,
          useValue: { uploadFile: vi.fn().mockResolvedValue({ secure_url: 'mock_url' }) }
        }
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return dashboard stats', async () => {
    const stats = await controller.getDashboardStats();
    expect(stats.stats.ordersToday.value).toBe(1);
    expect(stats.pipeline.length).toBe(6);
  });

  it('should return orders list', async () => {
    const res = await controller.getOrders({});
    expect(res.data.length).toBe(1);
    expect(res.total).toBe(1);
  });

  it('should return order details by id', async () => {
    const res = await controller.getOrderById('CRN-DEMO042');
    expect(res.id).toBe('CRN-DEMO042');
    expect(res.customer.name).toBe('Adaeze Okafor');
  });

  it('should update order status', async () => {
    const res = await controller.updateOrderStatus('CRN-DEMO042', { status: 'Delivered' });
    expect(res.success).toBe(true);
    expect(res.data.status).toBe('Delivered');
  });
});
