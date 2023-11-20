import { ConfigService } from '@nestjs/config/dist';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CacheSubSystemService } from './cachesubsystem/cachesubsystem.service';
import { router } from './core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const cacheSubSystemService = app.get(CacheSubSystemService);
  await cacheSubSystemService.deleteCacheSubSystem();
  router(app, configService);

  await app.listen(configService.get<number>('SERVER_PORT'));
}

bootstrap();
