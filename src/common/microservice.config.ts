import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MicroserviceConfig {
  private readonly logger = new Logger(MicroserviceConfig.name);

  getServiceName(): string {
    return process.env.SERVICE_NAME || 'nestjs-api';
  }

  getServiceVersion(): string {
    return process.env.SERVICE_VERSION || '1.0.0';
  }

  getServiceId(): string {
    return `${this.getServiceName()}-${Date.now()}`;
  }

  getConsulConfig() {
    return {
      host: process.env.CONSUL_HOST || 'localhost',
      port: parseInt(process.env.CONSUL_PORT || '8500'),
      service: {
        name: this.getServiceName(),
        id: this.getServiceId(),
        address: process.env.SERVICE_HOST || 'localhost',
        port: parseInt(process.env.PORT || '3000'),
        check: {
          http: `http://${process.env.SERVICE_HOST || 'localhost'}:${process.env.PORT || '3000'}/health`,
          interval: '10s',
        },
      },
    };
  }

  getJaegerConfig() {
    return {
      serviceName: this.getServiceName(),
      jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      sampler: {
        type: 'const',
        param: 1,
      },
    };
  }
}