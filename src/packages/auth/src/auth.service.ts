import { Injectable, Logger } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { RedisClient } from './redis.client';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import {
  UserAlreadyExistsError,
  InvalidCredentialsError,
  InvalidTokenError,
  ValidationError,
} from './exceptions/auth.exceptions';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly redis: RedisClient
    // Optionally inject messaging services when they are available
  ) {}

  private jwtSecret(): string {
    return process.env.JWT_SECRET || 'changeme';
  }
  private accessExp(): string {
    return process.env.ACCESS_TOKEN_EXP || '15m';
  }
  private refreshExpDays() {
    return parseInt(process.env.REFRESH_TOKEN_EXP?.replace('d', '') || '7');
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('email', 'Invalid email format');
    }
  }

  private validatePassword(password: string): void {
    if (password.length < 6) {
      throw new ValidationError('password', 'Password must be at least 6 characters long');
    }
  }

  async register(email: string, password: string, name?: string) {
    try {
      // Validate input
      this.validateEmail(email);
      this.validatePassword(password);

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new UserAlreadyExistsError(email);
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashed,
          name,
          role: 'user',
        },
      });

      this.logger.log(`User registered successfully: ${user.email}`);

      // TODO: Publish user registered event via Kafka
      // await this.kafkaService.publishUserRegistered(user.id, user.email);

      // TODO: Send welcome email via BullMQ
      // await this.bullMQService.sendWelcomeEmail(user.email, user.name);

      return user;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new UserAlreadyExistsError(email);
      }
      if (error instanceof ValidationError || error instanceof UserAlreadyExistsError) {
        throw error;
      }
      this.logger.error(`Registration failed for ${email}:`, error);
      throw error;
    }
  }

  async validateUser(email: string, password: string) {
    try {
      this.validateEmail(email);
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new InvalidCredentialsError();
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        throw new InvalidCredentialsError();
      }

      this.logger.log(`User validated successfully: ${user.email}`);
      return user;
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw error;
      }
      this.logger.error(`Validation failed for ${email}:`, error);
      throw new InvalidCredentialsError();
    }
  }

  async signAccessToken(payload: any) {
    return sign(payload, this.jwtSecret(), { expiresIn: this.accessExp() } as any);
  }

  async signRefreshToken(userId: string) {
    try {
      const exp = new Date();
      exp.setDate(exp.getDate() + this.refreshExpDays());
      // Generate a temporary token string to store
      const tempToken = sign({ userId, timestamp: Date.now() }, this.jwtSecret());
      const refreshToken = await prisma.refreshToken.create({
        data: { userId, token: tempToken, expiresAt: exp },
      });
      return sign({ tokenId: refreshToken.id }, this.jwtSecret());
    } catch (error) {
      this.logger.error('Failed to create refresh token:', error);
      throw new InvalidTokenError('Failed to create refresh token');
    }
  }

  async revokeRefreshToken(token: string) {
    try {
      await this.redis.set(`revoked_${token}`, 'true');
      this.logger.log(`Refresh token revoked: ${token.substring(0, 10)}...`);
    } catch (error) {
      this.logger.error('Failed to revoke token:', error);
      throw new InvalidTokenError('Failed to revoke token');
    }
  }

  async isRevoked(token: string): Promise<boolean> {
    try {
      const revoked = await this.redis.get(`revoked_${token}`);
      return !!revoked;
    } catch (error) {
      this.logger.error('Failed to check token revocation:', error);
      return false;
    }
  }
}
