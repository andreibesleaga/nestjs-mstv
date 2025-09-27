import { Module } from '@nestjs/common';
import { HttpsService } from './https.service';
import { AppWebSocketGateway } from './websocket.gateway';
import { MqttService } from './mqtt.service';
import { GrpcUserService } from './grpc.service';
import { AuthModule } from '../modules/auth/auth.module';
import { FeatureFlagsService } from '../common/services/feature-flags.service';

@Module({
  imports: [AuthModule],
  providers: [
    FeatureFlagsService,
    HttpsService,
    MqttService,
    AppWebSocketGateway,
    GrpcUserService, // Available but disabled by default
  ],
  exports: [FeatureFlagsService, HttpsService, MqttService, AppWebSocketGateway, GrpcUserService],
})
export class ProtocolsModule {}
