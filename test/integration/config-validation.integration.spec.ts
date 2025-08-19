import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ConfigValidationService } from '../../src/common/services/config.validation.service';

describe('ConfigValidationService Integration Tests', () => {
  let service: ConfigValidationService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      providers: [ConfigValidationService],
    }).compile();

    service = module.get<ConfigValidationService>(ConfigValidationService);
  });

  describe('Basic Configuration Validation', () => {
    it('should validate configuration successfully', () => {
      const validConfig = service.validateConfig();
      expect(validConfig).toBeDefined();
      expect(validConfig.DATABASE_TYPE).toBeDefined();
      expect(validConfig.STORAGE_PROVIDER).toBeDefined();
    });

    it('should handle environment variables properly', () => {
      const validConfig = service.validateConfig();
      expect(validConfig.PORT).toBeDefined();
      expect(validConfig.NODE_ENV).toBeDefined();
    });
  });
});
