import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

/** e2e 에서는 한도를 적용하지 않는다 — 인메모리 카운터가 테스트 순서에 따라 누적돼 불안정해지기 때문. */
const isTest = () => process.env.NODE_ENV === 'test';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { TemplatesModule } from './templates/templates.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { FormsModule } from './forms/forms.module';
import { LinksModule } from './links/links.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }], skipIf: isTest }),
    PrismaModule,
    CommonModule,
    AuthModule,
    TemplatesModule,
    CampaignsModule,
    FormsModule,
    LinksModule,
    SubmissionsModule,
    StatsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
