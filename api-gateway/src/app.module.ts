import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { HealthController } from './health/health.controller';
import { ProductsProxyController } from './proxy/products.proxy.controller';
import { OrdersProxyController } from './proxy/orders.proxy.controller';
import { AuthModule } from './auth/auth.module';
import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({ useFactory: databaseConfig, inject: [ConfigService] }),
    HttpModule,
    AuthModule,
  ],
  controllers: [AppController, HealthController, ProductsProxyController, OrdersProxyController],
})
export class AppModule {}
