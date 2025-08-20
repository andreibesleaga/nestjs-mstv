import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const jwtSecret = process.env.JWT_SECRET || 'changeme';
      const payload = jwt.verify(token, jwtSecret) as any;

      // Populate user context for subsequent guards
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role || 'user',
      };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }
  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
