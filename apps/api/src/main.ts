import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1); // Railway/프록시 뒤에서 x-forwarded-proto 신뢰

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Glowuprizz Lead Magnet CRM — Admin API')
    .setDescription(
      '운영자 인증, HTML 템플릿 등록, 캠페인/폼 관리, 배포 링크, CRM 명단, 성과 조회 API. ' +
        '인증은 httpOnly 쿠키(gu_admin)로 전달됩니다.',
    )
    .setVersion('1.0')
    .addCookieAuth('gu_admin')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`api listening on :${port} (docs: /docs)`);
}
bootstrap();
