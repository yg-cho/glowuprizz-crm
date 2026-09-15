import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentOperator, OperatorPrincipal } from '../common/current-operator.decorator';
import { StatsService } from './stats.service';

@ApiTags('stats')
@ApiCookieAuth('gu_admin')
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('overview')
  @ApiOperation({ summary: '전체 합계: 방문/방문자/신청/전환율/캠페인수/폼수' })
  overview(@CurrentOperator() op: OperatorPrincipal) {
    return this.stats.overview(op.id);
  }

  @Get('campaigns')
  @ApiOperation({ summary: '캠페인별 방문, 방문자, 신청, 전환율(신청÷방문자)' })
  byCampaign(@CurrentOperator() op: OperatorPrincipal) {
    return this.stats.byCampaign(op.id);
  }

  @Get('channels')
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiOperation({ summary: '채널별 성과 (INSTAGRAM/X/YOUTUBE/THREADS). campaignId 로 필터 가능' })
  byChannel(@CurrentOperator() op: OperatorPrincipal, @Query('campaignId') campaignId?: string) {
    return this.stats.byChannel(op.id, campaignId || undefined);
  }
}
