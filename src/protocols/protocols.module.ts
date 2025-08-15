import { Module } from '@nestjs/common';
import { HttpsService } from './https.service';
import { AppWebSocketGateway } from './websocket.gateway';
import { MqttService } from './mqtt.service';
import { GrpcUserService } from './grpc/grpc.service';
import { AuthModule } from '../modules/auth/auth.module';
import { FeatureFlagsService } from '../common/feature-flags.service';

@Module({
  imports: [AuthModule],
  providers: [
    // Always provide HttpsService; it internally gates behavior via FeatureFlagsService
    FeatureFlagsService,
    HttpsService,
    ...(process.env.ENABLE_WEBSOCKET === 'true' ? [AppWebSocketGateway] : []),
    ...(process.env.ENABLE_MQTT === 'true' ? [MqttService] : []),
    ...(process.env.ENABLE_GRPC === 'true' ? [GrpcUserService] : []),
  ],
  exports: [
    FeatureFlagsService,
    HttpsService,
    ...(process.env.ENABLE_WEBSOCKET === 'true' ? [AppWebSocketGateway] : []),
    ...(process.env.ENABLE_MQTT === 'true' ? [MqttService] : []),
    ...(process.env.ENABLE_GRPC === 'true' ? [GrpcUserService] : []),
  ],
})
export class ProtocolsModule {}
