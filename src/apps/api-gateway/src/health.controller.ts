import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns the health status of the application',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2023-01-01T00:00:00.000Z',
        uptime: 12345,
        version: '1.0.0',
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };
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
    return { status: 'ready' };
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
    return { status: 'alive' };
  }
}
