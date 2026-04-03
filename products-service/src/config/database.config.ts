import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const databaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get<string>('DB_HOST', 'localhost'),
  port: config.get<number>('DB_PORT', 5432),
  username: config.get<string>('DB_USER', 'products_user'),
  password: config.get<string>('DB_PASS', 'products_pass'),
  database: config.get<string>('DB_NAME', 'products_db'),
  autoLoadEntities: true,
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: config.get<string>('NODE_ENV') === 'development',
  migrationsRun: config.get<string>('NODE_ENV') !== 'development',
  logging: config.get<string>('NODE_ENV') === 'development',
});
