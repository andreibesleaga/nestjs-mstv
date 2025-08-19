import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport, ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { MicroserviceTransportConfig } from '../types';

export interface TransportClient {
  name: string;
  transport: Transport;
  client: ClientProxy;
  config: MicroserviceTransportConfig;
  isConnected: boolean;
}

@Injectable()
export class TransportManager {
  private readonly logger = new Logger(TransportManager.name);
  private clients: Map<string, TransportClient> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async initialize(): Promise<void> {
    const transports = this.getEnabledTransports();
    
    for (const transport of transports) {
      try {
        await this.initializeTransport(transport);
      } catch (error) {
        this.logger.error(`Failed to initialize ${transport} transport:`, error);
      }
    }
  }

  async destroy(): Promise<void> {
    const destroyPromises = Array.from(this.clients.values()).map(async (transportClient) => {
      try {
        await transportClient.client.close();
        this.logger.log(`${transportClient.name} transport disconnected`);
      } catch (error) {
        this.logger.error(`Error disconnecting ${transportClient.name}:`, error);
      }
    });

    await Promise.all(destroyPromises);
    this.clients.clear();
  }

  send<T = any>(pattern: string, data: any, transport = 'tcp'): Observable<T> {
    const client = this.getClient(transport);
    if (!client) {
      throw new Error(`Transport ${transport} not available`);
    }
    return client.send<T>(pattern, data);
  }

  emit<T = any>(pattern: string, data: any, transport = 'tcp'): Observable<T> {
    const client = this.getClient(transport);
    if (!client) {
      throw new Error(`Transport ${transport} not available`);
    }
    return client.emit<T>(pattern, data);
  }

  getTransportNames(): string[] {
    return Array.from(this.clients.keys());
  }

  getClient(name: string): ClientProxy | null {
    const transport = this.clients.get(name);
    return transport?.client || null;
  }

  getMetrics() {
    const transports = Array.from(this.clients.values()).map(client => ({
      name: client.name,
      transport: client.transport,
      connected: client.isConnected,
    }));

    return {
      totalTransports: this.clients.size,
      connectedTransports: transports.filter(t => t.connected).length,
      transports,
    };
  }

  getConnectedTransports(): TransportClient[] {
    return Array.from(this.clients.values()).filter(t => t.isConnected);
  }

  getTransportStatus(): { name: string; connected: boolean; transport: Transport }[] {
    return Array.from(this.clients.values()).map(t => ({
      name: t.name,
      connected: t.isConnected,
      transport: t.transport,
    }));
  }

  private getEnabledTransports(): string[] {
    const transports: string[] = [];
    
    if (this.configService.get<boolean>('ENABLE_TCP_MICROSERVICE')) {
      transports.push('tcp');
    }
    if (this.configService.get<boolean>('ENABLE_REDIS_MICROSERVICE')) {
      transports.push('redis');
    }
    if (this.configService.get<boolean>('ENABLE_NATS_MICROSERVICE')) {
      transports.push('nats');
    }
    if (this.configService.get<boolean>('ENABLE_RABBITMQ_MICROSERVICE')) {
      transports.push('rabbitmq');
    }
    
    return transports;
  }

  private async initializeTransport(transportName: string): Promise<void> {
    switch (transportName) {
      case 'tcp':
        await this.initializeTCP();
        break;
      case 'redis':
        await this.initializeRedis();
        break;
      case 'nats':
        await this.initializeNATS();
        break;
      case 'rabbitmq':
        await this.initializeRabbitMQ();
        break;
      default:
        this.logger.warn(`Unknown transport: ${transportName}`);
    }
  }

  private async initializeTCP(): Promise<void> {
    const config: MicroserviceTransportConfig = {
      host: this.configService.get<string>('TCP_HOST', 'localhost'),
      port: this.configService.get<number>('TCP_PORT', 3001),
      retryAttempts: this.configService.get<number>('TCP_RETRY_ATTEMPTS', 5),
      retryDelay: this.configService.get<number>('TCP_RETRY_DELAY', 3000),
      timeout: this.configService.get<number>('TCP_TIMEOUT', 5000),
    };

    const client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: config.host,
        port: config.port,
        retryAttempts: config.retryAttempts,
        retryDelay: config.retryDelay,
      },
    } as any);

    await this.connectClient('tcp', Transport.TCP, client, config);
  }

  private async initializeRedis(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    
    const client = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: {
        host: this.extractHostFromUrl(redisUrl),
        port: this.extractPortFromUrl(redisUrl, 6379),
        retryAttempts: 5,
        retryDelay: 3000,
      },
    } as any);

    const config: MicroserviceTransportConfig = {
      host: this.extractHostFromUrl(redisUrl),
      port: this.extractPortFromUrl(redisUrl, 6379),
      retryAttempts: 5,
      retryDelay: 3000,
      timeout: 5000,
    };

    await this.connectClient('redis', Transport.REDIS, client, config);
  }

  private async initializeNATS(): Promise<void> {
    const natsServers = this.configService.get<string>('NATS_SERVERS', 'nats://localhost:4222');
    
    const client = ClientProxyFactory.create({
      transport: Transport.NATS,
      options: {
        servers: [natsServers],
        user: this.configService.get<string>('NATS_USER'),
        pass: this.configService.get<string>('NATS_PASS'),
        token: this.configService.get<string>('NATS_TOKEN'),
      },
    } as any);

    const config: MicroserviceTransportConfig = {
      host: this.extractHostFromUrl(natsServers),
      port: this.extractPortFromUrl(natsServers, 4222),
      retryAttempts: this.configService.get<number>('NATS_RETRY_ATTEMPTS', 5),
      retryDelay: this.configService.get<number>('NATS_RETRY_DELAY', 3000),
      timeout: this.configService.get<number>('NATS_TIMEOUT', 5000),
    };

    await this.connectClient('nats', Transport.NATS, client, config);
  }

  private async initializeRabbitMQ(): Promise<void> {
    const rabbitUrl = this.configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');
    
    const client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitUrl],
        queue: this.configService.get<string>('RABBITMQ_QUEUE', 'nestjs_queue'),
        queueOptions: {
          durable: this.configService.get<boolean>('RABBITMQ_DURABLE', true),
          exclusive: this.configService.get<boolean>('RABBITMQ_EXCLUSIVE', false),
          autoDelete: this.configService.get<boolean>('RABBITMQ_AUTO_DELETE', false),
        },
        socketOptions: {
          heartbeatIntervalInSeconds: this.configService.get<number>('RABBITMQ_HEARTBEAT', 60),
          reconnectTimeInSeconds: this.configService.get<number>('RABBITMQ_RECONNECT', 5),
        },
      },
    } as any);

    const config: MicroserviceTransportConfig = {
      host: this.extractHostFromUrl(rabbitUrl),
      port: this.extractPortFromUrl(rabbitUrl, 5672),
      retryAttempts: this.configService.get<number>('RABBITMQ_RETRY_ATTEMPTS', 5),
      retryDelay: this.configService.get<number>('RABBITMQ_RETRY_DELAY', 3000),
      timeout: this.configService.get<number>('RABBITMQ_TIMEOUT', 5000),
    };

    await this.connectClient('rabbitmq', Transport.RMQ, client, config);
  }

  private async connectClient(
    name: string,
    transport: Transport,
    client: ClientProxy,
    config: MicroserviceTransportConfig
  ): Promise<void> {
    try {
      await client.connect();
      
      const transportClient: TransportClient = {
        name,
        transport,
        client,
        config,
        isConnected: true,
      };
      
      this.clients.set(name, transportClient);
      this.logger.log(`${name.toUpperCase()} transport connected successfully`);
    } catch (error) {
      this.logger.error(`Failed to connect ${name} transport:`, error);
      
      const transportClient: TransportClient = {
        name,
        transport,
        client,
        config,
        isConnected: false,
      };
      
      this.clients.set(name, transportClient);
    }
  }

  private extractHostFromUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return 'localhost';
    }
  }

  private extractPortFromUrl(url: string, defaultPort: number): number {
    try {
      const parsed = new URL(url);
      return parsed.port ? parseInt(parsed.port, 10) : defaultPort;
    } catch {
      return defaultPort;
    }
  }
}
