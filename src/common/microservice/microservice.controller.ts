import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Query,
  Logger,
  BadRequestException,
  NotFoundException,
  Sse
} from '@nestjs/common';
import { Observable, interval, map, switchMap } from 'rxjs';
import { MicroserviceService, StreamingMessage } from './microservice.service';
import { MicroserviceConfigService } from './microservice-config.service';

interface MessageRequest {
  transport: string;
  pattern: string;
  data: any;
}

interface EventRequest {
  transport: string;
  pattern: string;
  data: any;
}

interface QueueJobRequest {
  queueName: string;
  jobName: string;
  data: any;
  options?: any;
}

interface StreamRequest {
  channel: string;
  data: any;
}

interface CronJobRequest {
  name: string;
  cronTime: string;
  description?: string;
}

@Controller('microservice')
export class MicroserviceController {
  private readonly logger = new Logger(MicroserviceController.name);

  constructor(
    private readonly microserviceService: MicroserviceService,
    private readonly configService: MicroserviceConfigService,
  ) {}

  /**
   * Get microservice status
   */
  @Get('status')
  async getStatus() {
    return {
      service: 'microservice',
      status: 'healthy',
      transports: this.microserviceService.getAvailableTransports(),
      streamingChannels: this.microserviceService.getStreamingChannels(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get microservice configuration
   */
  @Get('config')
  async getConfig() {
    return {
      tcp: this.configService.getTcpConfig(),
      redis: this.configService.getRedisConfig(),
      nats: this.configService.getNatsConfig(),
      rabbitmq: this.configService.getRabbitMqConfig(),
      grpc: this.configService.getGrpcConfig(),
      kafka: this.configService.getKafkaConfig(),
      bullmq: this.configService.getBullMqConfig(),
      mqtt: this.configService.getMqttConfig(),
      streaming: this.configService.getStreamingConfig(),
      scheduler: this.configService.getSchedulerConfig(),
    };
  }

  /**
   * Send a message via specific transport
   */
  @Post('message')
  async sendMessage(@Body() request: MessageRequest) {
    try {
      const result = await this.microserviceService.sendMessage(
        request.transport,
        request.pattern,
        request.data
      );
      
      this.logger.log(`Message sent via ${request.transport}: ${request.pattern}`);
      
      return {
        success: true,
        transport: request.transport,
        pattern: request.pattern,
        result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to send message via ${request.transport}`, error);
      throw new BadRequestException(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Emit an event via specific transport
   */
  @Post('event')
  async emitEvent(@Body() request: EventRequest) {
    try {
      await this.microserviceService.emitEvent(
        request.transport,
        request.pattern,
        request.data
      );
      
      this.logger.log(`Event emitted via ${request.transport}: ${request.pattern}`);
      
      return {
        success: true,
        transport: request.transport,
        pattern: request.pattern,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to emit event via ${request.transport}`, error);
      throw new BadRequestException(`Failed to emit event: ${error.message}`);
    }
  }

  /**
   * Send Kafka message
   */
  @Post('kafka/message')
  async sendKafkaMessage(@Body() request: { topic: string; data: any }) {
    try {
      await this.microserviceService.sendKafkaMessage(request.topic, request.data);
      
      this.logger.log(`Kafka message sent to topic: ${request.topic}`);
      
      return {
        success: true,
        transport: 'kafka',
        topic: request.topic,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to send Kafka message to topic ${request.topic}`, error);
      throw new BadRequestException(`Failed to send Kafka message: ${error.message}`);
    }
  }

  /**
   * Add job to queue
   */
  @Post('queue/job')
  async addQueueJob(@Body() request: QueueJobRequest) {
    try {
      await this.microserviceService.addQueueJob(
        request.queueName,
        request.jobName,
        request.data,
        request.options
      );
      
      this.logger.log(`Job added to queue ${request.queueName}: ${request.jobName}`);
      
      return {
        success: true,
        queueName: request.queueName,
        jobName: request.jobName,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to add job to queue ${request.queueName}`, error);
      throw new BadRequestException(`Failed to add queue job: ${error.message}`);
    }
  }

  /**
   * Publish MQTT message
   */
  @Post('mqtt/message')
  async publishMqttMessage(@Body() request: { topic: string; message: string }) {
    try {
      await this.microserviceService.publishMqttMessage(request.topic, request.message);
      
      this.logger.log(`MQTT message published to topic: ${request.topic}`);
      
      return {
        success: true,
        transport: 'mqtt',
        topic: request.topic,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to publish MQTT message to topic ${request.topic}`, error);
      throw new BadRequestException(`Failed to publish MQTT message: ${error.message}`);
    }
  }

  /**
   * Stream data to a channel
   */
  @Post('stream')
  async streamData(@Body() request: StreamRequest) {
    try {
      this.microserviceService.streamData(request.channel, request.data);
      
      this.logger.log(`Data streamed to channel: ${request.channel}`);
      
      return {
        success: true,
        channel: request.channel,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to stream data to channel ${request.channel}`, error);
      throw new BadRequestException(`Failed to stream data: ${error.message}`);
    }
  }

  /**
   * Subscribe to streaming channel via Server-Sent Events
   */
  @Sse('stream/:channel')
  subscribeToStream(@Param('channel') channel: string): Observable<any> {
    try {
      return this.microserviceService.subscribeToStream(channel).pipe(
        map((message: StreamingMessage) => ({
          data: JSON.stringify(message),
          type: 'streaming-message',
          id: message.id,
        }))
      );
    } catch (error) {
      this.logger.error(`Failed to subscribe to stream channel ${channel}`, error);
      throw new NotFoundException(`Streaming channel not found: ${channel}`);
    }
  }

  /**
   * Get streaming channels
   */
  @Get('stream/channels')
  getStreamingChannels() {
    return {
      channels: this.microserviceService.getStreamingChannels(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add cron job
   */
  @Post('cron')
  async addCronJob(@Body() request: CronJobRequest) {
    try {
      // For demo purposes, create a simple logging callback
      const callback = () => {
        this.logger.log(`Executing cron job: ${request.name}`);
      };

      this.microserviceService.addCronJob(request.name, request.cronTime, callback);
      
      return {
        success: true,
        name: request.name,
        cronTime: request.cronTime,
        description: request.description,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to add cron job ${request.name}`, error);
      throw new BadRequestException(`Failed to add cron job: ${error.message}`);
    }
  }

  /**
   * Remove cron job
   */
  @Post('cron/:name/remove')
  async removeCronJob(@Param('name') name: string) {
    try {
      this.microserviceService.removeCronJob(name);
      
      return {
        success: true,
        name,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to remove cron job ${name}`, error);
      throw new BadRequestException(`Failed to remove cron job: ${error.message}`);
    }
  }

  /**
   * Get live service status via Server-Sent Events
   */
  @Sse('status/live')
  getLiveStatus(): Observable<any> {
    return interval(5000).pipe(
      switchMap(() => this.microserviceService.getStatus()),
      map((status) => ({
        data: JSON.stringify(status),
        type: 'status-update',
      }))
    );
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  async healthCheck() {
    const transports = this.microserviceService.getAvailableTransports();
    const channels = this.microserviceService.getStreamingChannels();
    
    return {
      status: 'healthy',
      service: 'microservice',
      transports: {
        count: transports.length,
        list: transports,
      },
      streaming: {
        channels: channels.length,
        list: channels,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Metrics endpoint
   */
  @Get('metrics')
  async getMetrics() {
    return {
      transports: {
        active: this.microserviceService.getAvailableTransports().length,
        available: ['tcp', 'redis', 'nats', 'rabbitmq', 'grpc', 'kafka', 'mqtt'],
      },
      streaming: {
        channels: this.microserviceService.getStreamingChannels().length,
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
        version: process.version,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Test connectivity to a specific transport
   */
  @Post('test/:transport')
  async testTransport(@Param('transport') transport: string) {
    try {
      const testData = { test: true, timestamp: new Date().toISOString() };
      
      // Send a test message
      const result = await this.microserviceService.sendMessage(
        transport,
        'test.ping',
        testData
      );
      
      return {
        success: true,
        transport,
        result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Transport test failed for ${transport}`, error);
      throw new BadRequestException(`Transport test failed: ${error.message}`);
    }
  }
}
