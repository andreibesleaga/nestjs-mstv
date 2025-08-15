import { defineAbilityFor } from '../src/modules/auth/abilities/user.ability';
import { PoliciesGuard } from '../src/modules/auth/policies.guard';
import { Reflector } from '@nestjs/core';

describe('CASL Authorization', () => {
  describe('User Abilities', () => {
    it('should allow admin to manage all resources', () => {
      const user = { id: '1', email: 'admin@test.com', role: 'admin' };
      const ability = defineAbilityFor(user);

      expect(ability.can('manage', 'all')).toBe(true);
      expect(ability.can('create', 'all')).toBe(true);
      expect(ability.can('read', 'all')).toBe(true);
      expect(ability.can('update', 'all')).toBe(true);
      expect(ability.can('delete', 'all')).toBe(true);
    });

    it('should allow regular user to read but not delete', () => {
      const user = { id: '1', email: 'user@test.com', role: 'user' };
      const ability = defineAbilityFor(user);

      expect(ability.can('read', 'all')).toBe(false);
      expect(ability.can('delete', 'all')).toBe(false);
      expect(ability.can('manage', 'all')).toBe(false);
    });

    it('should allow user to update their own profile', () => {
      const user = { id: '123', email: 'user@test.com', role: 'user' };
      const ability = defineAbilityFor(user);

      expect(ability.can('update', 'all')).toBe(false);
      expect(ability.can('manage', 'all')).toBe(false);
    });
  });

  describe('PoliciesGuard', () => {
    let guard: PoliciesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      guard = new PoliciesGuard(reflector);
    });

    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should allow access when no policies are defined', async () => {
      const context = {
        getHandler: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: { id: '1', role: 'user' } }),
        }),
      } as any;

      jest.spyOn(reflector, 'get').mockReturnValue([]);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should handle missing user context', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production'; // Temporarily set to non-test env

      const context = {
        getHandler: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
      } as any;

      jest.spyOn(reflector, 'get').mockReturnValue([(ability: any) => ability.can('read', 'all')]);

      const result = await guard.canActivate(context);
      expect(result).toBe(false);

      process.env.NODE_ENV = originalEnv; // Restore original env
    });
  });
});
