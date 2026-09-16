import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

/** e2e 에서는 한도를 적용하지 않는다 — 인메모리 카운터가 테스트 순서에 따라 누적돼 불안정해지기 때문. */
const isTest = () => process.env.NODE_ENV === 'test';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }], skipIf: isTest }), // 라우트별 @Throttle 이 우선. 렌더 GET 은 300/min, 제출 20/min
    PrismaModule,
    PublicModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
