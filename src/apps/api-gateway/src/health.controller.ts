import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthResponseSchema } from '../../../schemas/openapi.schemas';
import { HealthService } from '../../../common/health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

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
}
