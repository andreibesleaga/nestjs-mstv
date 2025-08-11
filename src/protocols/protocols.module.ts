import { Module } from '@nestjs/common';
import { HttpsService } from './https.service';
import { AppWebSocketGateway } from './websocket.gateway';
import { MqttService } from './mqtt.service';
import { GrpcUserService } from './grpc/grpc.service';
import { AuthModule } from '../packages/auth/src/auth.module';

@Module({
  imports: [AuthModule],
  providers: [
    HttpsService,
    AppWebSocketGateway,
    MqttService,
    GrpcUserService,
  ],
  exports: [
    HttpsService,
    AppWebSocketGateway,
    MqttService,
    GrpcUserService,
  ],
})
export class ProtocolsModule {}