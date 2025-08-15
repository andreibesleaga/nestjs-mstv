# Network Protocols Implementation

## Overview

This module provides support for multiple network protocols to enable communication across different network environments and use cases.

## Supported Protocols

### 1. HTTPS (Secure HTTP)

**Use Cases:**

- Secure API communication between services
- External API integrations
- Client-server communication with encryption

**Configuration:**

```bash
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

**Example Usage:**

```typescript
// Automatic HTTPS when certificates are configured
// Server starts with SSL/TLS encryption
const httpsService = new HttpsService(new FeatureFlagsService());
const response = await httpsService.makeSecureRequest('https://api.example.com/data');
```

### 2. WebSocket (Real-time Communication)

**Use Cases:**

- Real-time chat applications
- Live notifications and updates
- Collaborative editing
- Live dashboards and monitoring

**Configuration:**

```bash
WS_PORT=3001
```

**Example Usage:**

```typescript
// Client-side JavaScript
const socket = io('ws://localhost:3000/ws');
socket.emit('message', { text: 'Hello WebSocket!' });
socket.on('response', (data) => console.log(data));

// Join room for targeted messaging
socket.emit('join-room', 'user-notifications');
```

### 3. MQTT (IoT Messaging)

**Use Cases:**

- IoT device communication
- Sensor data collection
- Device control and monitoring
- Lightweight messaging between services

**Configuration:**

```bash
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
```

**Example Usage:**

```typescript
// Publish user events
mqttService.publishUserEvent('user123', 'login', { ip: '192.168.1.1' });

// Publish system alerts
mqttService.publishSystemAlert('error', 'Database connection failed');

// Subscribe to topics
mqttService.subscribe('sensors/temperature');
```

### 4. gRPC (High-Performance RPC)

**Use Cases:**

- Microservice-to-microservice communication
- High-performance internal APIs
- Type-safe service contracts
- Streaming data processing

**Configuration:**

```bash
GRPC_PORT=5000
```

**Example Usage:**

```typescript
// gRPC client example
const client = new UserServiceClient('localhost:5000');

// Create user
const user = await client.createUser({
  email: 'user@example.com',
  name: 'John Doe',
  password: 'secure123',
});

// Get user
const userData = await client.getUser({ id: 'user123' });
```

## Protocol Selection Guide

| Protocol  | Best For                        | Performance | Complexity | Security |
| --------- | ------------------------------- | ----------- | ---------- | -------- |
| HTTPS     | Web APIs, External integrations | Medium      | Low        | High     |
| WebSocket | Real-time apps, Live updates    | High        | Medium     | Medium   |
| MQTT      | IoT, Lightweight messaging      | High        | Low        | Medium   |
| gRPC      | Microservices, Internal APIs    | Very High   | High       | High     |

## Implementation Examples

### Real-time Notification System

```typescript
// WebSocket for browser clients
websocketGateway.broadcastToRoom('user-123', 'notification', {
  type: 'message',
  content: 'New message received',
});

// MQTT for mobile/IoT clients
mqttService.publishUserEvent('user-123', 'notification', {
  type: 'message',
  content: 'New message received',
});
```

### Microservice Communication

```typescript
// gRPC for internal service calls
const user = await grpcUserService.createUser({
  email: 'user@example.com',
  name: 'John Doe',
  password: 'secure123',
});

// HTTPS for external API calls
const externalData = await httpsService.makeSecureRequest('https://external-api.com/data', {
  userId: user.id,
});
```

### IoT Data Collection

```typescript
// MQTT for sensor data
mqttService.subscribe('sensors/+/temperature');
mqttService.subscribe('sensors/+/humidity');

// Process and store data
mqttService.publish('processed/sensor-data', {
  deviceId: 'sensor-001',
  temperature: 23.5,
  humidity: 65.2,
  timestamp: new Date().toISOString(),
});
```

## Testing

All protocols include comprehensive unit tests:

```bash
# Run protocol tests
pnpm test test/protocols.spec.ts

# Test specific protocol
pnpm test -- --testNamePattern="HttpsService"
```

## Security Considerations

- **HTTPS**: Always use valid SSL certificates in production
- **WebSocket**: Implement proper authentication and rate limiting
- **MQTT**: Use TLS encryption and strong authentication
- **gRPC**: Enable TLS and implement proper authorization

## Performance Tips

- **WebSocket**: Use rooms for efficient message broadcasting
- **MQTT**: Use appropriate QoS levels for message delivery
- **gRPC**: Implement connection pooling for high-throughput scenarios
- **HTTPS**: Use HTTP/2 and connection keep-alive for better performance
