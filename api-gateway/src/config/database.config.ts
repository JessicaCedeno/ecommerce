import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get<string>('DB_HOST', 'localhost'),
  port: config.get<number>('DB_PORT', 5432),
  username: config.get<string>('DB_USER', 'postgres'),
  password: config.get<string>('DB_PASS', 'postgres'),
  database: config.get<string>('DB_NAME', 'gateway_db'),
  autoLoadEntities: true,
  synchronize: config.get<string>('NODE_ENV') === 'development',
  logging: config.get<string>('NODE_ENV') === 'development',
});
