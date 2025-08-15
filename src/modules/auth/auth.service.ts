import { Injectable, Logger, Optional } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { RedisClient } from './redis.client';
import * as bcrypt from 'bcrypt';
import {
  UserAlreadyExistsError,
  InvalidCredentialsError,
  InvalidTokenError,
  ValidationError,
} from './exceptions/auth.exceptions';
import { PrismaService } from '../../common/prisma.service';
import { UserKafkaService } from '../../modules/users/messaging/user-kafka.service';
import { UserEmailService } from '../../modules/users/messaging/user-email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly redis: RedisClient,
    private readonly prisma: PrismaService,
    @Optional() private readonly userKafkaService?: UserKafkaService,
    @Optional() private readonly userEmailService?: UserEmailService
  ) {}

  private jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || this.isDefaultSecret(secret)) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production environment');
      }
      this.logger.warn('Using default JWT secret - not suitable for production');
      return 'changeme';
    }
    return secret;
  }

  private isDefaultSecret(secret: string): boolean {
    const defaultSecret = Buffer.from('changeme');
    const providedSecret = Buffer.from(secret);
    if (defaultSecret.length !== providedSecret.length) return false;
    return require('crypto').timingSafeEqual(defaultSecret, providedSecret);
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
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new UserAlreadyExistsError(email);
      }

      const hashed = await bcrypt.hash(password, 10);

      // Add retry logic for database operations
      let retries = 3;
      let user = null;

      while (retries > 0 && !user) {
        try {
          user = await this.prisma.user.create({
            data: {
              email,
              password: hashed,
              name,
              role: 'user',
            },
          });

          if (user && user.id) {
            break; // Success!
          }

          this.logger.warn(
            `User creation returned null/invalid user, retrying... (${retries} attempts left)`
          );
          retries--;
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
          }
        } catch (dbError) {
          if (dbError.code === 'P2002') {
            // Unique constraint violation - don't retry
            throw new UserAlreadyExistsError(email);
          }

          this.logger.warn(
            `Database error during user creation, retrying... (${retries} attempts left):`,
            dbError.message
          );
          retries--;
          if (retries === 0) {
            throw dbError;
          }
          await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay before retry
        }
      }

      if (!user) {
        throw new Error('User creation failed after retries - prisma returned null');
      }

      if (!user.id) {
        throw new Error(`User creation failed - no user id. User object: ${JSON.stringify(user)}`);
      }

      this.logger.log(`User registered successfully: ${user.id}`);

      // Publish events (with error tolerance)
      try {
        await this.userKafkaService?.publishUserRegistered(
          user.id,
          user.email,
          user.name,
          user.role
        );
        await this.userKafkaService?.publishEmailWelcome(user.id, user.email, user.name);
        await this.userEmailService?.sendWelcomeEmail(user.email, user.name);
      } catch (error) {
        this.logger.warn('Failed to publish user registration events:', error);
      }

      return user;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new UserAlreadyExistsError(email);
      }
      if (error instanceof ValidationError || error instanceof UserAlreadyExistsError) {
        throw error;
      }
      this.logger.error(`Registration failed for ${email}:`, error.message || error);
      throw error;
    }
  }

  async validateUser(email: string, password: string) {
    try {
      this.validateEmail(email);
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new InvalidCredentialsError();
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        throw new InvalidCredentialsError();
      }

      this.logger.log(`User validated successfully: ${user.id}`);

      // Publish login event
      try {
        await this.userKafkaService?.publishUserLoggedIn(user.id);
      } catch (error) {
        this.logger.warn('Failed to publish login event:', error);
      }

      return user;
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw error;
      }
      this.logger.error(`Validation failed for ${email}:`, error);
      throw new InvalidCredentialsError();
    }
  }

  async signAccessToken(payload: { sub: string; email: string; role: string }) {
    try {
      return sign(payload, this.jwtSecret(), { expiresIn: this.accessExp() } as any);
    } catch (error) {
      this.logger.error('Failed to sign access token:', error);
      throw new InvalidTokenError('Failed to generate access token');
    }
  }

  async signRefreshToken(userId: string) {
    try {
      const exp = new Date();
      exp.setDate(exp.getDate() + this.refreshExpDays());
      const tempToken = sign({ userId, timestamp: Date.now() }, this.jwtSecret());
      const refreshToken = await this.prisma.refreshToken.create({
        data: { userId, token: tempToken, expiresAt: exp },
      });

      const token = sign({ tokenId: refreshToken.id }, this.jwtSecret());

      // Publish token refresh event
      try {
        await this.userKafkaService?.publishTokenRefreshed(userId, refreshToken.id);
      } catch (error) {
        this.logger.warn('Failed to publish token refresh event:', error);
      }

      return token;
    } catch (error) {
      this.logger.error('Failed to create refresh token:', error);
      throw new InvalidTokenError('Failed to create refresh token');
    }
  }

  async revokeRefreshToken(token: string, userId?: string) {
    try {
      await this.redis.set(`revoked_${token}`, 'true');
      this.logger.log(`Refresh token revoked: ${token.substring(0, 10)}...`);

      // Publish logout event if userId provided
      if (userId) {
        try {
          await this.userKafkaService?.publishUserLoggedOut(userId);
        } catch (error) {
          this.logger.warn('Failed to publish logout event:', error);
        }
      }
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

  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const isRevoked = await this.isRevoked(refreshToken);
      if (isRevoked) {
        throw new InvalidTokenError('Token has been revoked');
      }

      // Find refresh token in database
      const tokenRecord = await this.prisma.refreshToken.findFirst({
        where: { token: refreshToken, revoked: false },
        include: { user: true },
      });

      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        throw new InvalidTokenError('Invalid or expired refresh token');
      }

      const access_token = await this.signAccessToken({
        sub: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role,
      });

      // Publish token refresh event
      try {
        await this.userKafkaService?.publishTokenRefreshed(tokenRecord.user.id, tokenRecord.id);
      } catch (error) {
        this.logger.warn('Failed to publish token refresh event:', error);
      }

      return access_token;
    } catch (error) {
      this.logger.error('Failed to refresh access token:', error);
      throw error;
    }
  }

  async getAllUsers() {
    try {
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return users;
    } catch (error) {
      this.logger.error('Failed to get all users:', error);
      throw error;
    }
  }
}
