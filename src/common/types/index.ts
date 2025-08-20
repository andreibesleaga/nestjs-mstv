// Type definitions for improved type safety across the application

// MQTT Service Types
export interface MqttUserEventData {
  userId: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface MqttSystemAlert {
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
}

export interface MqttPublishPayload {
  userId?: string;
  event?: string;
  data?: Record<string, unknown>;
  level?: string;
  message?: string;
  timestamp: string;
}

// WebSocket Gateway Types
export interface WebSocketMessage<T = Record<string, unknown>> {
  type: string;
  payload: T;
  timestamp: string;
  clientId?: string;
}

export interface WebSocketResponse<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// HTTPS Service Types
export interface HttpsRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface HttpsResponse<T = Record<string, unknown>> {
  data: T;
  status: number;
  headers: Record<string, string>;
  success: boolean;
}

// Microservice Configuration Types
export interface MicroserviceTransportConfig {
  host: string;
  port: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface StreamingMessage<T = Record<string, unknown>> {
  id: string;
  data: T;
  timestamp: string; // Changed from Date to string for consistency
  source: string;
  type: string;
  channel?: string; // Added channel property
}

export interface MicroserviceStatus {
  status: 'initializing' | 'ready' | 'error' | 'stopping';
  transports: string[];
  lastUpdated: Date;
  errors?: string[];
}

// Jaeger/Tracing Types
export interface TracingSpan {
  operationName: string;
  parentSpan?: TracingSpan;
  startTime: number;
  duration?: number;
  tags: Record<string, string | number | boolean>;
  logs: TracingLog[];
}

export interface TracingLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, unknown>;
}

// Storage Adapter Types
export interface StorageFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface StorageUploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface StorageDownloadResult {
  success: boolean;
  buffer?: Buffer;
  metadata?: Record<string, unknown>;
  error?: string;
}

// Cache Service Types
export interface CacheSetOptions {
  ttl?: number;
  namespace?: string;
}

export interface CacheGetResult<T = unknown> {
  found: boolean;
  value?: T;
  ttl?: number;
}

// Error Handler Types
export interface ErrorContext {
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  user?: {
    id?: string;
    email?: string;
  };
  timestamp: Date;
  traceId?: string;
}

export interface ErrorReport {
  error: Error;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  reportedAt: Date;
}

// Authentication Types
export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: Record<string, unknown>;
}

// Configuration Types
export interface DatabaseConfig {
  type: 'postgresql' | 'mysql' | 'mongodb' | 'memory';
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}

export interface MessagingConfig {
  kafka?: {
    brokers: string[];
    clientId: string;
    groupId: string;
  };
  redis?: {
    url: string;
    keyPrefix?: string;
  };
}

// Generic Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

//` Type Guards
export function isErrorResponse(response: unknown): response is ApiResponse<never> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    !(response as ApiResponse).success
  );
}

export function isValidationError(error: unknown): error is ValidationError {
  return typeof error === 'object' && error !== null && 'field' in error && 'message' in error;
}

// Scheduler Types
export interface CronJobConfig {
  name: string;
  cronPattern: string;
  task: () => Promise<void> | void;
  timezone?: string;
  startNow?: boolean;
  maxRetries?: number;
}

export interface SchedulerStatus {
  name: string;
  running: boolean;
  nextDate?: Date;
  lastDate?: Date;
  executionCount: number;
  lastRun?: Date;
  lastError?: string;
  averageExecutionTime: number;
}
