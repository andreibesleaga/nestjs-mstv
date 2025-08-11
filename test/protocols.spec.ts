import { HttpsService } from '../src/protocols/https.service';
import { MqttService } from '../src/protocols/mqtt.service';
import { AppWebSocketGateway } from '../src/protocols/websocket.gateway';
import { GrpcUserService } from '../src/protocols/grpc/grpc.service';

describe('Protocol Services', () => {
  describe('HttpsService', () => {
    let service: HttpsService;

    beforeEach(() => {
      service = new HttpsService();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return null when SSL not configured', () => {
      delete process.env.SSL_CERT_PATH;
      delete process.env.SSL_KEY_PATH;
      
      const options = service.getHttpsOptions();
      expect(options).toBeNull();
    });
  });

  describe('MqttService', () => {
    let service: MqttService;

    beforeEach(() => {
      service = new MqttService();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should publish user event', () => {
      const publishSpy = jest.spyOn(service, 'publish').mockImplementation();
      
      service.publishUserEvent('user123', 'login', { ip: '127.0.0.1' });
      
      expect(publishSpy).toHaveBeenCalledWith('users/user123/login', {
        userId: 'user123',
        event: 'login',
        data: { ip: '127.0.0.1' },
        timestamp: expect.any(String),
      });
    });

    it('should publish system alert', () => {
      const publishSpy = jest.spyOn(service, 'publish').mockImplementation();
      
      service.publishSystemAlert('error', 'Database connection failed');
      
      expect(publishSpy).toHaveBeenCalledWith('system/alerts/error', {
        level: 'error',
        message: 'Database connection failed',
        timestamp: expect.any(String),
      });
    });
  });

  describe('AppWebSocketGateway', () => {
    let gateway: AppWebSocketGateway;

    beforeEach(() => {
      gateway = new AppWebSocketGateway();
    });

    it('should be defined', () => {
      expect(gateway).toBeDefined();
    });

    it('should handle message', () => {
      const mockClient = { id: 'client123' } as any;
      const result = gateway.handleMessage({ text: 'hello' }, mockClient);
      
      expect(result).toEqual({
        event: 'response',
        data: 'Echo: {"text":"hello"}',
      });
    });
  });

  describe('GrpcUserService', () => {
    let service: GrpcUserService;
    let mockAuthService: any;

    beforeEach(() => {
      mockAuthService = {
        register: jest.fn(),
        getAllUsers: jest.fn(),
      };
      service = new GrpcUserService(mockAuthService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should get user', async () => {
      const result = await service.getUser({ id: 'user123' });
      
      expect(result).toEqual({
        id: 'user123',
        email: 'user@example.com',
        name: 'John Doe',
        role: 'user',
        created_at: expect.any(String),
      });
    });

    it('should create user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date(),
      };
      
      mockAuthService.register.mockResolvedValue(mockUser);
      
      const result = await service.createUser({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      });
      
      expect(result.email).toBe('test@example.com');
      expect(mockAuthService.register).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'Test User'
      );
    });
  });
});