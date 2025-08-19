import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MicroserviceConfig } from '../config/microservice.config';
import { FeatureFlagsService } from './feature-flags.service';

@Injectable()
export class ConsulService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConsulService.name);
  private consul: any;
  private serviceId: string;
  private isEnabled = false;

  constructor(
    private readonly config: MicroserviceConfig,
    private readonly featureFlags: FeatureFlagsService
  ) {}

  async onModuleInit() {
    this.isEnabled = this.featureFlags.isConsulDiscoveryEnabled;

    if (!this.isEnabled) {
      this.logger.log('Consul service discovery is disabled by feature flag');
      return;
    }

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

      // Make consul registration non-blocking to prevent app startup failure
      this.consul.agent.service.register(consulConfig.service, (err: any) => {
        if (err) {
          this.logger.error('Failed to register with Consul:', err.message);
        } else {
          this.logger.log(`Service registered with Consul: ${this.serviceId}`);
        }
      });
    } catch (error) {
      this.logger.error('Failed to initialize Consul:', error.message);
      // Don't let Consul failures prevent app startup
    }
  }

  async onModuleDestroy() {
    if (!this.isEnabled || !this.consul || !this.serviceId) return;

    try {
      await this.consul.agent.service.deregister(this.serviceId);
      this.logger.log(`Service deregistered from Consul: ${this.serviceId}`);
    } catch (error) {
      this.logger.error('Failed to deregister from Consul:', error.message);
    }
  }

  async getHealthyServices(serviceName: string): Promise<any[]> {
    if (!this.isEnabled || !this.consul) {
      this.logger.warn('Consul service discovery is disabled');
      return [];
    }
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
