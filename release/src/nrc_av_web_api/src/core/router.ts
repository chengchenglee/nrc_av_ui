import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder } from '@nestjs/swagger';
import { SwaggerModule } from '@nestjs/swagger/dist';
import cookieParser from 'cookie-parser';

export const router = (app: INestApplication, configService: ConfigService) => {
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());

  // Setup Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nissan')
    .setDescription('API for Nissan project')
    .setVersion('0.1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/explorer', app, document);

  app.enableCors({
    origin: configService.get<string>('client.clientUrl'),
    preflightContinue: false,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    optionsSuccessStatus: 204
  });
};
