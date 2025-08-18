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
  DATABASE_TYPE: z.enum(['postgresql', 'mongodb', 'mysql', 'mariadb']).default('postgresql'),
  DATABASE_URL: z.string().optional(),
  MONGODB_URL: z.string().optional(),
  MYSQL_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Feature Flags - Protocols
  ENABLE_WEBSOCKET: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_MQTT: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  ENABLE_HTTPS: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_GRPC: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // Feature Flags - Services
  ENABLE_JAEGER_TRACING: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  ENABLE_REDIS_CACHE: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_CONSUL_DISCOVERY: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  ENABLE_CIRCUIT_BREAKER: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  CB_THRESHOLD: z
    .string()
    .transform((v) => (v ? Number(v) : undefined))
    .optional(),
  CB_TIMEOUT: z
    .string()
    .transform((v) => (v ? Number(v) : undefined))
    .optional(),
  CB_RESET_TIMEOUT: z
    .string()
    .transform((v) => (v ? Number(v) : undefined))
    .optional(),
  ENABLE_PERFORMANCE_MONITORING: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  ENABLE_EMAIL_SERVICE: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),

  // Database Pooling (Prisma/PostgreSQL)
  PRISMA_CONNECTION_LIMIT: z
    .string()
    .transform((v) => (v ? Number(v) : undefined))
    .optional(),
  PRISMA_POOL_TIMEOUT: z
    .string()
    .transform((v) => (v ? Number(v) : undefined))
    .optional(),

  // Database Pooling (MongoDB)
  MONGODB_MAX_POOL_SIZE: z
    .string()
    .transform((v) => (v ? Number(v) : undefined))
    .optional(),
  MONGODB_MIN_POOL_SIZE: z
    .string()
    .transform((v) => (v ? Number(v) : undefined))
    .optional(),
  MONGODB_MAX_IDLE_TIME_MS: z
    .string()
    .transform((v) => (v ? Number(v) : undefined))
    .optional(),
  MONGODB_WAIT_QUEUE_TIMEOUT_MS: z
    .string()
    .transform((v) => (v ? Number(v) : undefined))
    .optional(),

  // Observability - OpenTelemetry & Exporters
  ENABLE_OPENTELEMETRY: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  SERVICE_NAME: z.string().default('nestjs-mstv'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  OTEL_TRACES_EXPORTER: z.enum(['otlp', 'none']).default('otlp'),
  OTEL_METRICS_EXPORTER: z.enum(['prometheus', 'otlp', 'none']).default('none'),

  // Prometheus
  ENABLE_PROMETHEUS_METRICS: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  PROMETHEUS_HOST: z.string().default('0.0.0.0'),
  PROMETHEUS_PORT: z.string().transform(Number).default('9464'),

  // SigNoz (OTLP-compatible)
  ENABLE_SIGNOZ_TRACING: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  SIGNOZ_ENDPOINT: z.string().optional(),

  // Datadog (OTLP-compatible)
  ENABLE_DATADOG_TRACING: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  DATADOG_OTLP_ENDPOINT: z.string().optional(),
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
