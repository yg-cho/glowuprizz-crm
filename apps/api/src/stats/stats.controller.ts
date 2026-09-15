import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentOperator, OperatorPrincipal } from '../common/current-operator.decorator';
import { StatsService } from './stats.service';
import { StatsQueryDto, VisitorsQueryDto } from './dto/stats-query.dto';

/**
 * 성과 조회. 모든 엔드포인트가 StatsQueryDto 필터(campaignId · formId · channel · range/from/to · compare)를 공유한다.
 * 단계 수는 고유 방문자(gu_vid) 기준. 정의는 ADR-0007.
 */
@ApiTags('stats')
@ApiCookieAuth('gu_admin')
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('overview')
  @ApiOperation({ summary: '전체 합계(전 기간): 방문/방문자/신청/전환율/캠페인수/폼수' })
  overview(@CurrentOperator() op: OperatorPrincipal) {
    return this.stats.overview(op.id);
  }

  @Get('funnel')
  @ApiOperation({ summary: '5단계 퍼널: 링크 클릭 → 폼 도달 → 작성 시작 → 제출 시도 → 신청 완료. 단계 전환율·누적 전환율·이탈, 최대 이탈 구간, compare 시 직전 기간' })
  funnel(@CurrentOperator() op: OperatorPrincipal, @Query() q: StatsQueryDto) {
    return this.stats.funnel(op.id, q);
  }

  @Get('timeseries')
  @ApiOperation({ summary: '일별 추이(KST): 방문자 · 작성 시작 · 신청 · 전환율' })
  timeseries(@CurrentOperator() op: OperatorPrincipal, @Query() q: StatsQueryDto) {
    return this.stats.timeseries(op.id, q);
  }

  @Get('channels')
  @ApiOperation({ summary: '채널별 단계 수·전환율·신청 기여 (4채널 고정, 직접 유입 제외)' })
  channels(@CurrentOperator() op: OperatorPrincipal, @Query() q: StatsQueryDto) {
    return this.stats.channels(op.id, q);
  }

  @Get('campaigns')
  @ApiOperation({ summary: '캠페인별 단계 수·전환율 (+ 폼/링크 수)' })
  campaigns(@CurrentOperator() op: OperatorPrincipal, @Query() q: StatsQueryDto) {
    return this.stats.campaigns(op.id, q);
  }

  @Get('links')
  @ApiOperation({ summary: '배포 링크별 단계 수·전환율 (같은 채널 내 게시 위치 비교)' })
  links(@CurrentOperator() op: OperatorPrincipal, @Query() q: StatsQueryDto) {
    return this.stats.links(op.id, q);
  }

  @Get('forms')
  @ApiOperation({ summary: '폼별 단계 전환율 (템플릿 A/B 비교)' })
  forms(@CurrentOperator() op: OperatorPrincipal, @Query() q: StatsQueryDto) {
    return this.stats.forms(op.id, q);
  }

  @Get('heatmap')
  @ApiOperation({ summary: '요일×시간(KST) 링크 클릭 수. grid[dow][hour], dow 0=일' })
  heatmap(@CurrentOperator() op: OperatorPrincipal, @Query() q: StatsQueryDto) {
    return this.stats.heatmap(op.id, q);
  }

  @Get('failures')
  @ApiOperation({ summary: '제출 실패 사유 집계 (reason · status)' })
  failures(@CurrentOperator() op: OperatorPrincipal, @Query() q: StatsQueryDto) {
    return this.stats.failures(op.id, q);
  }

  @Get('quality')
  @ApiOperation({ summary: '방문자 품질: 1회/재방문 후 신청 비율, 중복 전화번호, 봇 의심' })
  quality(@CurrentOperator() op: OperatorPrincipal, @Query() q: StatsQueryDto) {
    return this.stats.quality(op.id, q);
  }

  @Get('insights')
  @ApiOperation({ summary: '규칙 기반 주목점 (표본 20명 미만이면 빈 배열)' })
  insights(@CurrentOperator() op: OperatorPrincipal, @Query() q: StatsQueryDto) {
    return this.stats.insights(op.id, q);
  }

  @Get('visitors')
  @ApiOperation({ summary: '단계까지 도달한 방문자 목록 + 여정. submitted=false 면 미신청(리마케팅 후보)' })
  visitors(@CurrentOperator() op: OperatorPrincipal, @Query() q: VisitorsQueryDto) {
    return this.stats.visitors(op.id, q);
  }
}
