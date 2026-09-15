import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  app.enableShutdownHooks();
  // 기본 보안 헤더. CSP 는 HTML 라우트가 폼별로 직접 설정하므로 여기서는 끈다.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  setupApp(app);

  // 공개 서버의 API 문서는 운영에서 노출하지 않는다
  if (process.env.NODE_ENV !== 'production' || process.env.FORMS_DOCS === '1') {
    const config = new DocumentBuilder()
      .setTitle('Glowuprizz Lead Magnet CRM — Public Forms')
      .setDescription('배포 링크 렌더링, 방문 기록, 공개 폼 제출 API. 인증 없음. 관리자 API 와 분리된 origin 에서 동작.')
      .setVersion('1.0')
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }

  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);
  console.log(`forms listening on :${port}`);
}
bootstrap().catch((e) => { console.error('forms 기동 실패', e); process.exit(1); });
