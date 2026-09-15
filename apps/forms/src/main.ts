import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  app.use(cookieParser());
  // CORS 없음: 공개 폼과 제출 API 가 같은 origin. 다른 origin 의 fetch 는 브라우저가 차단.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Glowuprizz Lead Magnet CRM — Public Forms')
    .setDescription('배포 링크 렌더링, 방문 기록, 공개 폼 제출 API. 인증 없음. 관리자 API 와 분리된 origin 에서 동작.')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);
  console.log(`forms listening on :${port} (docs: /docs)`);
}
bootstrap();
