import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: vi.fn((dto) => {
      return { message: 'User registered successfully', user: { email: dto.email } };
    }),
    login: vi.fn((dto) => {
      return { message: 'Login successful', token: 'fake-jwt-token' };
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register a user', async () => {
    const registerDto = { firstName: 'John', lastName: 'Doe', email: 'john@test.com', phoneNumber: '1234567890', password: 'password' };
    const result = await controller.register(registerDto);
    expect(result).toEqual({ message: 'User registered successfully', user: { email: 'john@test.com' } });
    expect(service.register).toHaveBeenCalledWith(registerDto);
  });

  it('should login a user', async () => {
    const loginDto = { email: 'john@test.com', password: 'password' };
    const result = await controller.login(loginDto);
    expect(result).toEqual({ message: 'Login successful', token: 'fake-jwt-token' });
    expect(service.login).toHaveBeenCalledWith(loginDto);
  });
});
