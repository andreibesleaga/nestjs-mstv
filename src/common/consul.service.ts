import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MicroserviceConfig } from './microservice.config';

@Injectable()
export class ConsulService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConsulService.name);
  private consul: any;
  private serviceId: string;

  constructor(private readonly config: MicroserviceConfig) {}

  async onModuleInit() {
    if (!process.env.CONSUL_HOST) {
      this.logger.warn('Consul not configured - skipping service registration');
      return;
    }

    try {
      const consul = require('consul');
      this.consul = consul({
        host: process.env.CONSUL_HOST,
        port: parseInt(process.env.CONSUL_PORT || '8500'),
      });

      const consulConfig = this.config.getConsulConfig();
      this.serviceId = consulConfig.service.id;

      await this.consul.agent.service.register(consulConfig.service);
      this.logger.log(`Service registered with Consul: ${this.serviceId}`);
    } catch (error) {
      this.logger.error('Failed to register with Consul:', error.message);
    }
  }

  async onModuleDestroy() {
    if (this.consul && this.serviceId) {
      try {
        await this.consul.agent.service.deregister(this.serviceId);
        this.logger.log(`Service deregistered from Consul: ${this.serviceId}`);
      } catch (error) {
        this.logger.error('Failed to deregister from Consul:', error.message);
      }
    }
  }

  async getHealthyServices(serviceName: string): Promise<any[]> {
    if (!this.consul) return [];
    
    try {
      const result = await this.consul.health.service({ service: serviceName, passing: true });
      return result;
    } catch (error) {
      this.logger.error(`Failed to get healthy services for ${serviceName}:`, error.message);
      return [];
    }
  }
}