import { EnvironmentSchema } from './validation.schemas';

export function validateEnvironment() {
  try {
    return EnvironmentSchema.parse(process.env);
  } catch (error) {
    console.error('Environment validation failed:', error);
    process.exit(1);
  }
}
