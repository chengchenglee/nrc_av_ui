import { ConfigService } from '@nestjs/config/dist';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { router } from './core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  router(app, configService);

  await app.listen(configService.get<number>('SERVER_PORT'));
}

bootstrap();
