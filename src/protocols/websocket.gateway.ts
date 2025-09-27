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
import { FeatureFlagsService } from '../common/services/feature-flags.service';
import { WebSocketMessage, WebSocketResponse } from '../common/types';

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
  handleMessage(
    @MessageBody() data: WebSocketMessage,
    @ConnectedSocket() client: Socket
  ): WebSocketResponse<string> {
    if (!this.isEnabled) return this.createErrorResponse<string>('WebSocket service is disabled');

    this.logger.log(`Message from ${client.id}:`, data);
    return this.createSuccessResponse(`Echo: ${JSON.stringify(data)}`);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket
  ): WebSocketResponse<{ room: string }> {
    if (!this.isEnabled)
      return this.createErrorResponse<{ room: string }>('WebSocket service is disabled');

    client.join(room);
    client.emit('joined-room', { room });
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    return this.createSuccessResponse({ room });
  }

  broadcastToRoom<T = Record<string, unknown>>(room: string, event: string, data: T): void {
    if (!this.isEnabled) return;

    this.server.to(room).emit(event, data);
  }

  broadcast<T = Record<string, unknown>>(event: string, data: T): void {
    if (!this.isEnabled) return;

    this.server.emit(event, data);
  }

  private createSuccessResponse<T = Record<string, unknown>>(
    data: T,
    _type = 'response'
  ): WebSocketResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  private createErrorResponse<T = Record<string, unknown>>(error: string): WebSocketResponse<T> {
    return {
      success: false,
      error,
      timestamp: new Date().toISOString(),
    } as WebSocketResponse<T>;
  }
}
