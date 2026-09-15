import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/** 미들웨어·파이프. main.ts 와 e2e 가 같은 설정을 쓰도록 한곳에. (helmet·trust proxy 는 실제 서버에서만) */
export function setupApp(app: INestApplication) {
  app.use(cookieParser());
  // CORS 없음: 공개 폼과 제출 API 가 같은 origin. 다른 origin 의 fetch 는 브라우저가 차단.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  return app;
}
