import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { FeatureFlagsService } from '../common/feature-flags.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class AppWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppWebSocketGateway.name);
  private connectedClients = new Map<string, Socket>();
  private isEnabled = true;

  constructor(private readonly featureFlags: FeatureFlagsService) {}

  afterInit(server: Server) {
    this.isEnabled = this.featureFlags.isWebSocketEnabled;
    if (!this.isEnabled) {
      this.logger.warn('WebSocket is disabled by feature flag');
      server.close();
    } else {
      this.logger.log('WebSocket gateway initialized');
    }
  }

  handleConnection(client: Socket) {
    if (!this.isEnabled) {
      client.disconnect();
      return;
    }

    this.connectedClients.set(client.id, client);
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', { message: 'Connected to WebSocket server' });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    if (!this.isEnabled) return;

    this.logger.log(`Message from ${client.id}:`, data);
    return { event: 'response', data: `Echo: ${JSON.stringify(data)}` };
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(@MessageBody() room: string, @ConnectedSocket() client: Socket) {
    if (!this.isEnabled) return;

    client.join(room);
    client.emit('joined-room', { room });
    this.logger.log(`Client ${client.id} joined room: ${room}`);
  }

  broadcastToRoom(room: string, event: string, data: any) {
    if (!this.isEnabled) return;

    this.server.to(room).emit(event, data);
  }

  broadcast(event: string, data: any) {
    if (!this.isEnabled) return;

    this.server.emit(event, data);
  }
}
