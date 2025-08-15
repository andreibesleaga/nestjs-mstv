import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { FeatureFlagsService } from '../common/feature-flags.service';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;
  private isEnabled = false;

  constructor(private readonly featureFlags: FeatureFlagsService) {}

  async onModuleInit() {
    this.isEnabled = this.featureFlags.isMqttEnabled;

    if (!this.isEnabled) {
      this.logger.log('MQTT is disabled by feature flag');
      return;
    }

    if (!process.env.MQTT_BROKER_URL) {
      this.logger.warn('MQTT broker not configured - skipping MQTT setup');
      return;
    }

    try {
      this.client = mqtt.connect(process.env.MQTT_BROKER_URL, {
        clientId: `nestjs-${Math.random().toString(16).substr(2, 8)}`,
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
      });

      this.client.on('connect', () => {
        this.logger.log('Connected to MQTT broker');
      });

      this.client.on('error', (error) => {
        this.logger.error('MQTT connection error:', error);
      });

      this.client.on('message', (topic, message) => {
        this.logger.log(`MQTT message on ${topic}:`, message.toString());
      });
    } catch (error) {
      this.logger.error('Failed to initialize MQTT:', error.message);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      this.client.end();
      this.logger.log('MQTT client disconnected');
    }
  }

  publish(topic: string, message: string | object): void {
    if (!this.isEnabled || !this.client) return;

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    this.client.publish(topic, payload, (error) => {
      if (error) {
        this.logger.error(`Failed to publish to ${topic}:`, error);
      } else {
        this.logger.log(`Published to ${topic}: ${payload}`);
      }
    });
  }

  subscribe(topic: string): void {
    if (!this.isEnabled || !this.client) return;

    this.client.subscribe(topic, (error) => {
      if (error) {
        this.logger.error(`Failed to subscribe to ${topic}:`, error);
      } else {
        this.logger.log(`Subscribed to ${topic}`);
      }
    });
  }

  publishUserEvent(userId: string, event: string, data: any): void {
    if (!this.isEnabled) return;
    this.publish(`users/${userId}/${event}`, {
      userId,
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  publishSystemAlert(level: string, message: string): void {
    if (!this.isEnabled) return;
    this.publish(`system/alerts/${level}`, { level, message, timestamp: new Date().toISOString() });
  }
}
