import { HttpsService } from '../src/protocols/https.service';
import { MqttService } from '../src/protocols/mqtt.service';
import { AppWebSocketGateway } from '../src/protocols/websocket.gateway';
import { GrpcUserService } from '../src/protocols/grpc.service';
import { FeatureFlagsService } from '../src/common/services/feature-flags.service';

// Mock FeatureFlagsService
const mockFeatureFlagsService = {
  isWebSocketEnabled: true,
  isMqttEnabled: true,
  isHttpsEnabled: true,
  isGrpcEnabled: true,
  isJaegerTracingEnabled: true,
  isRedisCacheEnabled: true,
  isConsulDiscoveryEnabled: true,
  isCircuitBreakerEnabled: true,
  isPerformanceMonitoringEnabled: true,
  isEmailServiceEnabled: true,
} as FeatureFlagsService;

describe('Protocol Services', () => {
  describe('HttpsService', () => {
    let service: HttpsService;

    beforeEach(() => {
      service = new HttpsService(mockFeatureFlagsService);
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
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        publish: jest.fn(),
        on: jest.fn(),
        end: jest.fn(),
      };

      service = new MqttService(mockFeatureFlagsService);
      // Mock the isEnabled property since it's set in the constructor
      (service as any).isEnabled = true;
      (service as any).client = mockClient;
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should publish user event', () => {
      service.publishUserEvent('user123', 'login', { ip: '127.0.0.1' });

      expect(mockClient.publish).toHaveBeenCalledWith(
        'users/user123/login',
        expect.stringContaining('user123'),
        expect.any(Function)
      );
    });

    it('should publish system alert', () => {
      service.publishSystemAlert('error', 'Critical error occurred');

      expect(mockClient.publish).toHaveBeenCalledWith(
        'system/alerts/error',
        expect.stringContaining('Critical error occurred'),
        expect.any(Function)
      );
    });
  });

  describe('AppWebSocketGateway', () => {
    let gateway: AppWebSocketGateway;

    beforeEach(() => {
      gateway = new AppWebSocketGateway(mockFeatureFlagsService);
    });

    it('should be defined', () => {
      expect(gateway).toBeDefined();
    });

    it('should handle message', () => {
      const mockClient = { id: 'client123' } as any;
      const result = gateway.handleMessage({ 
        type: 'message', 
        payload: { text: 'hello' },
        timestamp: new Date().toISOString()
      }, mockClient);

      expect(result.success).toBe(true);
      expect(result.data).toContain('Echo: {"type":"message","payload":{"text":"hello"},"timestamp":"');
      expect(result.data).toContain('2025-08-19T');
      expect(typeof result.timestamp).toBe('string');
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
      service = new GrpcUserService(mockAuthService, mockFeatureFlagsService);
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
