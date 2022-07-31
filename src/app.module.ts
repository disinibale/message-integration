import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'

import { WebhookModule } from './webhook/webhook.module'
import { GraphApiModule } from './graph-api/graph-api.module'
import { ConfigModule } from '@nestjs/config'
import { getEnvPath } from './common/helpers/env.helper';
import { TypeOrmModule } from '@nestjs/typeorm'
import { TypeOrmConfigService } from './shared/typeorm/typeorm.service'
import { RoomsModule } from './rooms/rooms.module';
import { ChatsModule } from './chats/chats.module';
import { InstagramModule } from './instagram/instagram.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService
    }),
    WebhookModule, 
    GraphApiModule, 
    RoomsModule, 
    ChatsModule, 
    InstagramModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
