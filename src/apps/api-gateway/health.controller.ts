import { Controller, Get, Param, NotFoundException, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthResponseSchema } from '../../schemas/openapi.schemas';
import { HealthService } from '../../common/health.service';
import { CircuitBreakerService } from '../../common/circuit-breaker.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    @Optional() private readonly circuitBreaker?: CircuitBreakerService
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns the health status of the application',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    type: HealthResponseSchema,
  })
  async getHealth() {
    return this.healthService.getDetailedHealth();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description: 'Returns readiness status for Kubernetes probes',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
    schema: {
      example: { status: 'ready' },
    },
  })
  getReadiness() {
    return this.getHealthStatus('ready');
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness check',
    description: 'Returns liveness status for Kubernetes probes',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
    schema: {
      example: { status: 'alive' },
    },
  })
  getLiveness() {
    return this.getHealthStatus('alive');
  }

  private getHealthStatus(status: string) {
    return { status, timestamp: new Date().toISOString() };
  }

  @Get('circuit/:name')
  @ApiOperation({ summary: 'Circuit status', description: 'Get circuit breaker state by name' })
  @ApiResponse({ status: 200, description: 'Circuit status returned' })
  @ApiResponse({ status: 404, description: 'Circuit not found' })
  getCircuitStatus(@Param('name') name: string) {
    if (!this.circuitBreaker) {
      throw new NotFoundException('Circuit breaker is not enabled');
    }
    const status = this.circuitBreaker.getCircuitStatus(name);
    if (!status) {
      throw new NotFoundException(`Circuit ${name} not found`);
    }
    return { name, ...status };
  }
}
