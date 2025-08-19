# Microservice Service

A comprehensive NestJS service that enables and manages all microservice protocols and implementations including RPC, Pub/Sub, AMQP, scheduling, and streaming.

## Features

### Supported Transports

- **TCP** - Simple TCP-based communication
- **Redis** - Redis as message broker
- **NATS** - NATS messaging system
- **RabbitMQ (AMQP)** - Advanced Message Queuing Protocol
- **gRPC** - High-performance RPC framework
- **Kafka** - Distributed streaming platform (using existing KafkaService)
- **MQTT** - Lightweight messaging protocol (using existing MqttService)
- **BullMQ** - Job queue system (using existing BullMQService)

### Additional Features

- **Streaming** - Real-time data streaming with Server-Sent Events
- **Scheduling** - Cron job management and execution
- **Health Monitoring** - Transport health checks and metrics
- **Circuit Breaker** - Fault tolerance patterns
- **Retry Logic** - Configurable retry mechanisms

## Installation

The necessary dependencies are already included in the project:

```bash
pnpm install
```

Key dependencies:
- `@nestjs/microservices` - Core microservices support
- `@nestjs/schedule` - Cron job scheduling
- `cron` - Cron expression parsing

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Microservice Transports
ENABLE_TCP_MICROSERVICE=false
ENABLE_REDIS_MICROSERVICE=true
ENABLE_NATS_MICROSERVICE=false
ENABLE_RABBITMQ_MICROSERVICE=false
ENABLE_KAFKA=true
ENABLE_BULLMQ=true
ENABLE_STREAMING=true

# TCP Configuration
TCP_HOST=localhost
TCP_PORT=3001
TCP_RETRY_ATTEMPTS=5
TCP_RETRY_DELAY=3000
TCP_TIMEOUT=5000

# NATS Configuration
NATS_SERVERS=nats://localhost:4222
NATS_USER=
NATS_PASS=
NATS_TOKEN=
NATS_RETRY_ATTEMPTS=5
NATS_RETRY_DELAY=3000
NATS_TIMEOUT=5000

# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_QUEUE=nestjs_queue
RABBITMQ_DURABLE=true
RABBITMQ_EXCLUSIVE=false
RABBITMQ_AUTO_DELETE=false
RABBITMQ_HEARTBEAT=60
RABBITMQ_RECONNECT=5
RABBITMQ_RETRY_ATTEMPTS=5
RABBITMQ_RETRY_DELAY=3000
RABBITMQ_TIMEOUT=5000

# Streaming Configuration
STREAMING_CHANNELS=user-events,system-metrics,audit-logs,notifications,real-time-data
STREAMING_BUFFER_SIZE=1000
STREAMING_TIMEOUT=30000

# Scheduler Configuration
ENABLE_HEALTH_CHECK_CRON=true
HEALTH_CHECK_CRON=*/30 * * * *
ENABLE_METRICS_COLLECTION_CRON=false
METRICS_COLLECTION_CRON=*/5 * * * *
ENABLE_CLEANUP_CRON=false
CLEANUP_CRON=0 2 * * *
```

## Usage

### Import the Module

```typescript
import { Module } from '@nestjs/common';
import { MicroserviceModule } from './common/microservice/microservice.module';

@Module({
  imports: [MicroserviceModule],
})
export class AppModule {}
```

### Inject the Service

```typescript
import { Injectable } from '@nestjs/common';
import { MicroserviceService } from './common/microservice/microservice.service';

@Injectable()
export class MyService {
  constructor(private readonly microserviceService: MicroserviceService) {}

  async sendMessage() {
    return await this.microserviceService.sendMessage('redis', 'user.create', { name: 'John' });
  }
}
```

### HTTP API Endpoints

The service exposes REST endpoints for interaction:

#### Status & Health
- `GET /microservice/status` - Service status
- `GET /microservice/health` - Health check
- `GET /microservice/metrics` - Service metrics
- `GET /microservice/config` - Configuration overview

#### Messaging
- `POST /microservice/message` - Send message via transport
- `POST /microservice/event` - Emit event via transport
- `POST /microservice/kafka/message` - Send Kafka message
- `POST /microservice/mqtt/message` - Publish MQTT message
- `POST /microservice/queue/job` - Add job to queue

#### Streaming
- `POST /microservice/stream` - Stream data to channel
- `GET /microservice/stream/channels` - List streaming channels
- `GET /microservice/stream/:channel` - Subscribe to stream (SSE)

#### Scheduling
- `POST /microservice/cron` - Add cron job
- `POST /microservice/cron/:name/remove` - Remove cron job

#### Testing
- `POST /microservice/test/:transport` - Test transport connectivity

## Examples

### Sending Messages

```bash
# Send TCP message
curl -X POST http://localhost:3000/microservice/message \
  -H "Content-Type: application/json" \
  -d '{
    "transport": "tcp",
    "pattern": "user.create",
    "data": {"name": "John", "email": "john@example.com"}
  }'

# Send Redis message
curl -X POST http://localhost:3000/microservice/message \
  -H "Content-Type: application/json" \
  -d '{
    "transport": "redis",
    "pattern": "order.process",
    "data": {"orderId": "12345", "amount": 99.99}
  }'
```

### Kafka Messages

```bash
curl -X POST http://localhost:3000/microservice/kafka/message \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "user-events",
    "data": {"event": "user_created", "userId": "123"}
  }'
```

### Queue Jobs

```bash
curl -X POST http://localhost:3000/microservice/queue/job \
  -H "Content-Type: application/json" \
  -d '{
    "queueName": "email",
    "jobName": "send-welcome-email",
    "data": {"userId": "123", "email": "user@example.com"},
    "options": {"delay": 5000}
  }'
```

### Streaming Data

```bash
# Stream data
curl -X POST http://localhost:3000/microservice/stream \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "user-events",
    "data": {"event": "user_login", "userId": "123"}
  }'

# Subscribe to stream (Server-Sent Events)
curl http://localhost:3000/microservice/stream/user-events
```

### Cron Jobs

```bash
# Add cron job
curl -X POST http://localhost:3000/microservice/cron \
  -H "Content-Type: application/json" \
  -d '{
    "name": "daily-report",
    "cronTime": "0 9 * * *",
    "description": "Generate daily report at 9 AM"
  }'

# Remove cron job
curl -X POST http://localhost:3000/microservice/cron/daily-report/remove
```

## Programmatic Usage

### Service Methods

```typescript
import { MicroserviceService } from './common/microservice/microservice.service';

// Send message and wait for response
const result = await microserviceService.sendMessage('redis', 'user.get', { id: '123' });

// Emit event (fire and forget)
await microserviceService.emitEvent('tcp', 'user.updated', { id: '123', name: 'John' });

// Send Kafka message
await microserviceService.sendKafkaMessage('user-events', { event: 'created', id: '123' });

// Add queue job
await microserviceService.addQueueJob('email', 'send-notification', { userId: '123' });

// Publish MQTT message
await microserviceService.publishMqttMessage('devices/sensor1', 'temperature:25.5');

// Stream data
microserviceService.streamData('real-time-data', { sensor: 'temp1', value: 25.5 });

// Subscribe to stream
const subscription = microserviceService.subscribeToStream('user-events').subscribe(
  (message) => console.log('Received:', message)
);

// Add cron job
microserviceService.addCronJob('backup', '0 2 * * *', () => {
  console.log('Running backup...');
});
```

## Configuration Service

Use `MicroserviceConfigService` for advanced configuration:

```typescript
import { MicroserviceConfigService } from './common/microservice/microservice-config.service';

// Get transport configurations
const redisConfig = configService.getRedisConfig();
const kafkaConfig = configService.getKafkaConfig();
const schedulerConfig = configService.getSchedulerConfig();
```

## Monitoring

### Live Status Updates

Subscribe to live status updates via Server-Sent Events:

```bash
curl http://localhost:3000/microservice/status/live
```

### Health Checks

The service automatically performs health checks on all enabled transports every 30 seconds (configurable). Check the logs for health status updates.

### Metrics Collection

When enabled, the service collects and streams metrics every 5 minutes:

```typescript
// Enable in .env
ENABLE_METRICS_COLLECTION_CRON=true
METRICS_COLLECTION_CRON=*/5 * * * *
```

## Error Handling

The service includes comprehensive error handling:

- **Retry Logic** - Configurable retry attempts with exponential backoff
- **Circuit Breaker** - Fault tolerance for failing services
- **Timeout Management** - Per-transport timeout configuration
- **Health Monitoring** - Automatic detection of transport failures

## Testing

Test transport connectivity:

```bash
curl -X POST http://localhost:3000/microservice/test/redis
```

## Architecture

The microservice service follows a layered architecture:

1. **Controller Layer** - HTTP API endpoints
2. **Service Layer** - Business logic and transport management
3. **Configuration Layer** - Environment-based configuration
4. **Transport Layer** - Individual transport implementations

## Performance Considerations

- **Connection Pooling** - Reuses client connections across requests
- **Buffering** - Configurable buffer sizes for streaming
- **Timeouts** - Per-transport timeout configurations
- **Health Checks** - Automatic detection and recovery from failures

## Integration with Existing Services

The microservice service integrates with existing project services:

- **KafkaService** - Reuses existing Kafka implementation
- **BullMQService** - Reuses existing queue management
- **MqttService** - Reuses existing MQTT implementation
- **Feature Flags** - Respects existing feature flag system

## Troubleshooting

### Common Issues

1. **Transport not connecting** - Check configuration and service availability
2. **Messages not delivered** - Verify pattern matching and queue existence
3. **Cron jobs not executing** - Check cron expression syntax
4. **Streaming not working** - Verify channel names and SSE support

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug
```

### Health Check Endpoint

```bash
curl http://localhost:3000/microservice/health
```

This will show the status of all transports and provide troubleshooting information.
