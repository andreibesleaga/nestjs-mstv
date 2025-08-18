import { z } from 'zod';

export const EnvironmentSchema = z.object({
  TEMPORAL_ADDRESS: z.string().default('localhost:7233'),
  TEMPORAL_NAMESPACE: z.string().default('default'),
  TEMPORAL_TASK_QUEUE: z.string().default('coordination'),
  HEALTHCHECK_URL: z.string().url().default('http://localhost:3000/health'),
  HEALTHCHECK_CRON: z.string().default('0 2 * * *'), // every night at 2 AM
});

export type Environment = z.infer<typeof EnvironmentSchema>;

export type OrchestrationInput = {
  jobId: string;
  // service-specific payload, arbitrary JSON
  payload?: Record<string, any>;
};

export type OrchestrationResult = {
  jobId: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  details?: Record<string, any>;
};

export type SignalPayload = {
  type: 'ACTION1_DONE' | 'ACTION2_DONE' | 'ACTION3_DONE' | string;
  data?: any;
};

export const TestConfig = {
  defaultEnv: EnvironmentSchema.parse({}),
};
