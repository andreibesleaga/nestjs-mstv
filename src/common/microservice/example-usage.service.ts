import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MicroserviceService } from './microservice.service';

/**
 * Example service demonstrating how to use the MicroserviceService
 * This service shows practical examples of all microservice capabilities
 */
@Injectable()
export class ExampleMicroserviceUsageService {
  private readonly logger = new Logger(ExampleMicroserviceUsageService.name);

  constructor(private readonly microserviceService: MicroserviceService) {}

  /**
   * Example: User registration workflow using multiple transports
   */
  async handleUserRegistration(userData: any) {
    try {
      // 1. Send user data via Redis for immediate processing
      const userCreated = await this.microserviceService.sendMessage(
        'redis',
        'user.create',
        userData
      );

      // 2. Emit event for other services to react
      await this.microserviceService.emitEvent(
        'tcp',
        'user.registered',
        { userId: userCreated.id, email: userData.email }
      );

      // 3. Send Kafka message for analytics
      await this.microserviceService.sendKafkaMessage(
        'user-events',
        {
          event: 'user_registered',
          userId: userCreated.id,
          timestamp: new Date(),
          metadata: { source: 'api', version: '1.0' }
        }
      );

      // 4. Queue welcome email job
      await this.microserviceService.addQueueJob(
        'email',
        'send-welcome-email',
        {
          userId: userCreated.id,
          email: userData.email,
          name: userData.name
        },
        { delay: 2000 } // Delay 2 seconds
      );

      // 5. Stream real-time notification
      this.microserviceService.streamData(
        'notifications',
        {
          type: 'user_registered',
          userId: userCreated.id,
          message: `Welcome ${userData.name}!`
        }
      );

      this.logger.log(`User registration completed for: ${userData.email}`);
      return userCreated;

    } catch (error) {
      this.logger.error('User registration failed', error);
      
      // Stream error notification
      this.microserviceService.streamData(
        'notifications',
        {
          type: 'error',
          message: 'User registration failed',
          error: error.message
        }
      );
      
      throw error;
    }
  }

  /**
   * Example: Order processing workflow
   */
  async processOrder(orderData: any) {
    try {
      // 1. Send order to processing service via gRPC (if enabled)
      let orderResult;
      try {
        orderResult = await this.microserviceService.sendMessage(
          'grpc',
          'order.process',
          orderData
        );
      } catch (error) {
        // Fallback to Redis if gRPC is not available
        orderResult = await this.microserviceService.sendMessage(
          'redis',
          'order.process',
          orderData
        );
      }

      // 2. Send to inventory system via NATS (if enabled)
      try {
        await this.microserviceService.emitEvent(
          'nats',
          'inventory.reserve',
          { orderId: orderResult.id, items: orderData.items }
        );
      } catch (error) {
        this.logger.warn('NATS not available, using Redis for inventory', error);
        await this.microserviceService.emitEvent(
          'redis',
          'inventory.reserve',
          { orderId: orderResult.id, items: orderData.items }
        );
      }

      // 3. Publish to IoT devices via MQTT (if enabled)
      try {
        await this.microserviceService.publishMqttMessage(
          `warehouse/orders/${orderResult.id}`,
          JSON.stringify({
            action: 'prepare_shipment',
            orderId: orderResult.id,
            priority: orderData.priority || 'normal'
          })
        );
      } catch (error) {
        this.logger.warn('MQTT not available for warehouse notification', error);
      }

      // 4. Stream real-time order updates
      this.microserviceService.streamData(
        'real-time-data',
        {
          type: 'order_processing',
          orderId: orderResult.id,
          status: 'processing',
          timestamp: new Date()
        }
      );

      return orderResult;

    } catch (error) {
      this.logger.error('Order processing failed', error);
      throw error;
    }
  }

  /**
   * Example: System health monitoring
   */
  async performHealthCheck() {
    try {
      const healthData = {
        timestamp: new Date(),
        checks: {},
      };

      // Check each transport
      const transports = this.microserviceService.getAvailableTransports();
      
      for (const transport of transports) {
        try {
          await this.microserviceService.sendMessage(
            transport,
            'health.ping',
            { timestamp: new Date() }
          );
          healthData.checks[transport] = 'healthy';
        } catch (error) {
          healthData.checks[transport] = 'unhealthy';
          this.logger.warn(`Health check failed for ${transport}`, error);
        }
      }

      // Stream health status
      this.microserviceService.streamData('system-metrics', {
        type: 'health_check',
        data: healthData
      });

      return healthData;

    } catch (error) {
      this.logger.error('Health check failed', error);
      throw error;
    }
  }

  /**
   * Example: Data synchronization between services
   */
  async synchronizeData() {
    try {
      this.logger.log('Starting data synchronization...');

      // 1. Get data from multiple sources
      const userData = await this.microserviceService.sendMessage(
        'redis',
        'user.getAll',
        {}
      );

      const orderData = await this.microserviceService.sendMessage(
        'tcp',
        'order.getAll',
        {}
      );

      // 2. Send to analytics service via Kafka
      await this.microserviceService.sendKafkaMessage(
        'data-sync',
        {
          event: 'sync_batch',
          users: userData.length,
          orders: orderData.length,
          timestamp: new Date()
        }
      );

      // 3. Queue data processing jobs
      await this.microserviceService.addQueueJob(
        'data-processing',
        'sync-users',
        userData,
        { priority: 'high' }
      );

      await this.microserviceService.addQueueJob(
        'data-processing',
        'sync-orders',
        orderData,
        { priority: 'high' }
      );

      // 4. Stream progress updates
      this.microserviceService.streamData('system-metrics', {
        type: 'data_sync',
        status: 'completed',
        usersProcessed: userData.length,
        ordersProcessed: orderData.length,
        timestamp: new Date()
      });

      this.logger.log('Data synchronization completed');

    } catch (error) {
      this.logger.error('Data synchronization failed', error);
      
      // Stream error notification
      this.microserviceService.streamData('system-metrics', {
        type: 'data_sync',
        status: 'failed',
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Example: Scheduled backup task
   */
  @Cron('0 1 * * *', { name: 'example-backup' }) // Daily at 1 AM
  async performBackup() {
    try {
      this.logger.log('Starting scheduled backup...');

      // 1. Notify services about backup start
      await this.microserviceService.emitEvent(
        'redis',
        'system.backup.start',
        { timestamp: new Date() }
      );

      // 2. Stream backup progress
      this.microserviceService.streamData('system-metrics', {
        type: 'backup',
        status: 'started',
        timestamp: new Date()
      });

      // 3. Queue backup jobs for different data types
      await this.microserviceService.addQueueJob(
        'backup',
        'backup-users',
        { type: 'users' },
        { priority: 'low' }
      );

      await this.microserviceService.addQueueJob(
        'backup',
        'backup-orders',
        { type: 'orders' },
        { priority: 'low' }
      );

      // 4. Send completion notification via Kafka
      await this.microserviceService.sendKafkaMessage(
        'system-events',
        {
          event: 'backup_scheduled',
          timestamp: new Date(),
          jobs: ['backup-users', 'backup-orders']
        }
      );

      this.logger.log('Backup jobs scheduled successfully');

    } catch (error) {
      this.logger.error('Backup scheduling failed', error);
      
      // Stream error notification
      this.microserviceService.streamData('system-metrics', {
        type: 'backup',
        status: 'failed',
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Example: Real-time metrics collection
   */
  @Cron('*/5 * * * *', { name: 'example-metrics' }) // Every 5 minutes
  async collectMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        system: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          cpu: process.cpuUsage(),
        },
        transports: {
          active: this.microserviceService.getAvailableTransports().length,
          channels: this.microserviceService.getStreamingChannels().length,
        }
      };

      // 1. Send to metrics service
      await this.microserviceService.sendMessage(
        'redis',
        'metrics.collect',
        metrics
      );

      // 2. Stream real-time metrics
      this.microserviceService.streamData('system-metrics', {
        type: 'metrics_collection',
        data: metrics
      });

      // 3. Send to analytics via Kafka
      await this.microserviceService.sendKafkaMessage(
        'metrics',
        {
          event: 'metrics_collected',
          data: metrics
        }
      );

    } catch (error) {
      this.logger.error('Metrics collection failed', error);
    }
  }

  /**
   * Example: Subscribe to streaming data and react
   */
  subscribeToUserEvents() {
    const subscription = this.microserviceService.subscribeToStream('user-events').subscribe({
      next: (message) => {
        this.logger.log(`Received user event: ${JSON.stringify(message)}`);
        
        // React to different event types
        switch (message.data.type) {
          case 'user_registered':
            this.handleNewUserWelcome(message.data);
            break;
          case 'user_login':
            this.handleUserLogin(message.data);
            break;
          case 'user_logout':
            this.handleUserLogout(message.data);
            break;
        }
      },
      error: (error) => {
        this.logger.error('Error in user events stream', error);
      }
    });

    return subscription;
  }

  private async handleNewUserWelcome(data: any) {
    // Send welcome notification via queue
    await this.microserviceService.addQueueJob(
      'notifications',
      'send-welcome-notification',
      data
    );
  }

  private async handleUserLogin(data: any) {
    // Update user activity via Redis
    await this.microserviceService.emitEvent(
      'redis',
      'user.activity.login',
      data
    );
  }

  private async handleUserLogout(data: any) {
    // Update user activity via Redis
    await this.microserviceService.emitEvent(
      'redis',
      'user.activity.logout',
      data
    );
  }
}
