import { Injectable, Logger } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private isEnabled = false;
  private circuits = new Map<
    string,
    {
      state: CircuitState;
      failures: number;
      lastFailureTime: number;
      options: CircuitBreakerOptions;
    }
  >();

  private defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 10000, // 10 seconds
  };

  constructor(private readonly featureFlags: FeatureFlagsService) {
    this.isEnabled = this.featureFlags.isCircuitBreakerEnabled;
    if (!this.isEnabled) {
      this.logger.log('Circuit breaker is disabled by feature flag');
    }
  }

  async execute<T>(
    circuitName: string,
    operation: () => Promise<T>,
    options?: Partial<CircuitBreakerOptions>
  ): Promise<T> {
    // If circuit breaker is disabled, execute operation directly
    if (!this.isEnabled) {
      return await operation();
    }

    const circuit = this.getOrCreateCircuit(circuitName, options);

    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() - circuit.lastFailureTime > circuit.options.resetTimeout) {
        circuit.state = CircuitState.HALF_OPEN;
        this.logger.log(`Circuit ${circuitName} moved to HALF_OPEN`);
      } else {
        throw new Error(`Circuit ${circuitName} is OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess(circuitName);
      return result;
    } catch (error) {
      this.onFailure(circuitName);
      throw error;
    }
  }

  private getOrCreateCircuit(circuitName: string, options?: Partial<CircuitBreakerOptions>) {
    if (!this.circuits.has(circuitName)) {
      this.circuits.set(circuitName, {
        state: CircuitState.CLOSED,
        failures: 0,
        lastFailureTime: 0,
        options: { ...this.defaultOptions, ...options },
      });
    }
    return this.circuits.get(circuitName)!;
  }

  private onSuccess(circuitName: string) {
    const circuit = this.circuits.get(circuitName)!;
    circuit.failures = 0;
    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.state = CircuitState.CLOSED;
      this.logger.log(`Circuit ${circuitName} moved to CLOSED`);
    }
  }

  private onFailure(circuitName: string) {
    const circuit = this.circuits.get(circuitName)!;
    circuit.failures++;
    circuit.lastFailureTime = Date.now();

    if (circuit.failures >= circuit.options.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      this.logger.warn(`Circuit ${circuitName} moved to OPEN after ${circuit.failures} failures`);
    }
  }

  getCircuitStatus(circuitName: string) {
    const circuit = this.circuits.get(circuitName);
    return circuit
      ? {
          state: circuit.state,
          failures: circuit.failures,
          lastFailureTime: circuit.lastFailureTime,
        }
      : null;
  }
}
