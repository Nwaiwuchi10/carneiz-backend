import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    checkout: vi.fn((data) => {
      return { message: 'Payment initiated', paymentLink: 'https://flutterwave.com/pay/test' };
    }),
    verifyPayment: vi.fn((id) => {
      return { message: 'Payment successful', data: { status: 'successful' } };
    }),
    findAll: vi.fn((query) => {
      return { data: [{ id: '#ORD-2024-0847', total: 9900 }], total: 1, page: 1, limit: 10, totalPages: 1 };
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  it('should initiate checkout with Flutterwave', async () => {
    const dto = { amount: 15000, email: 'test@test.com', name: 'John', phone: '123' };
    const result = await controller.checkout(dto);
    expect(result).toEqual({ message: 'Payment initiated', paymentLink: 'https://flutterwave.com/pay/test' });
    expect(service.checkout).toHaveBeenCalledWith(dto);
  });

  it('should verify payment', async () => {
    const result = await controller.verifyPayment('tx_123');
    expect(result).toEqual({ message: 'Payment successful', data: { status: 'successful' } });
    expect(service.verifyPayment).toHaveBeenCalledWith('tx_123');
  });

  it('should fetch order history with search and pagination', async () => {
    const query = { page: 1, limit: 10, search: 'Beef' };
    const result = await controller.findAll(query);
    expect(result).toEqual({ data: [{ id: '#ORD-2024-0847', total: 9900 }], total: 1, page: 1, limit: 10, totalPages: 1 });
    expect(service.findAll).toHaveBeenCalledWith(query);
  });
});
