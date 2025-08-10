import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { defineAbilityFor, AppAbility } from './abilities/user.ability';

export interface RequiredRule {
  action: string;
  subject: string;
}

export const CHECK_POLICIES_KEY = 'check_policy';
export const CheckPolicies = (...handlers: ((ability: AppAbility) => boolean)[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers = this.reflector.get<((ability: AppAbility) => boolean)[]>(
      CHECK_POLICIES_KEY,
      context.getHandler(),
    ) || [];

    if (policyHandlers.length === 0) {
      return true; // No policies to check
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Assumes JWT guard has populated this

    if (!user) {
      return false;
    }

    const ability = defineAbilityFor(user);
    return policyHandlers.every((handler) => handler(ability));
  }
}
