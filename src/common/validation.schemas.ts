import { z } from 'zod';

// User validation schemas
export const UserRegistrationSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional(),
});

export const UserLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

// Environment validation schema
export const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_TYPE: z.enum(['postgresql', 'mongodb']).default('postgresql'),
  DATABASE_URL: z.string().optional(),
  MONGODB_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
});

// Kafka event schemas
export const UserEventSchema = z.object({
  event: z.string(),
  userId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.string().default('user'),
  timestamp: z.string().datetime(),
});

export const AuthEventSchema = z.object({
  event: z.string(),
  userId: z.string(),
  sessionId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: z.string().datetime(),
});

// Type exports
export type UserRegistrationInput = z.infer<typeof UserRegistrationSchema>;
export type UserLoginInput = z.infer<typeof UserLoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentSchema>;
export type UserEvent = z.infer<typeof UserEventSchema>;
export type AuthEvent = z.infer<typeof AuthEventSchema>;