import { Body, Controller, ForbiddenException, Get, Header, Headers, HttpCode, Logger, Param, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { FORM_TOKEN_HEADER } from '@glowuprizz/shared';
import { PAUSED_PAGE } from './paused-page';
import { PublicService } from './public.service';
import { SubmitDto } from './dto/submit.dto';
import { EventDto } from './dto/event.dto';
import { buildCsp, buildInjectScript, injectScript } from './inject';
import { ensureVisitorId, requestContext } from './visitor';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

@ApiTags('public')
@Controller()
export class PublicController {
  private readonly log = new Logger(PublicController.name);
  constructor(private readonly svc: PublicService) {}

  /**
   * 폼 페이지 서빙 공통 경로: 방문자 쿠키 → VIEW 이벤트 → 스크립트 주입 → CSP 헤더 → HTML.
   * 링크 경유(/l/:code)와 직접 접근(/f/:slug)의 차이는 linkId/linkCode 만.
   */
  private async serve(req: Request, res: Response, form: { id: string; slug: string; template: { html: string } }, link: { id: string; code: string } | null) {
    const visitorId = ensureVisitorId(req, res);
    // 링크 미리보기 크롤러의 HEAD 는 클릭이 아니다. 기록 실패는 랜딩을 막지 않는다(fail-open).
    if (req.method !== 'HEAD') {
      await this.svc.recordView(form.id, link?.id ?? null, visitorId, requestContext(req, visitorId)).catch((e) => this.log.error(`VIEW 기록 실패: ${e}`));
    }
    const token = this.svc.token.issue(form.slug, visitorId);
    const html = injectScript(form.template.html, buildInjectScript(form.slug, link?.code ?? null, token));
    res.setHeader('Content-Security-Policy', buildCsp());
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    res.type('html').send(html);
  }

  @Get('l/:code')
  @ApiOperation({ summary: '채널 배포 링크. 방문(VIEW) 기록 후 폼 HTML 렌더 (스크립트 주입, CSP 적용)' })
  @ApiResponse({ status: 200, description: 'text/html' })
  @ApiResponse({ status: 404, description: '링크 없음' })
  @ApiResponse({ status: 403, description: '폼 일시중지' })
  @Throttle({ default: { ttl: 60_000, limit: 300 } })
  async byLink(@Param('code') code: string, @Req() req: Request, @Res() res: Response) {
    await this.servePage(res, async () => { const link = await this.svc.resolveLink(code); await this.serve(req, res, link.form, link); });
  }

  @Get('f/:slug')
  @ApiOperation({ summary: '폼 직접 접근 (채널 없음). 방문 기록 후 렌더' })
  @Throttle({ default: { ttl: 60_000, limit: 300 } })
  async bySlug(@Param('slug') slug: string, @Req() req: Request, @Res() res: Response) {
    await this.servePage(res, async () => { const form = await this.svc.resolveForm(slug); await this.serve(req, res, form, null); });
  }

  /** 일시중지(403) 는 방문자에게 JSON 대신 안내 페이지. 그 외 예외는 그대로. */
  private async servePage(res: Response, run: () => Promise<void>) {
    try { await run(); }
    catch (e) {
      if (e instanceof ForbiddenException) { res.status(403); for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v); res.type('html').send(PAUSED_PAGE); return; }
      throw e;
    }
  }

  @Post('f/:slug/submissions')
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: '공개 폼 제출. 주입 스크립트가 호출. CRM 명단 + SUBMIT_SUCCESS 이벤트' })
  @ApiResponse({ status: 201, description: '저장됨 { id, createdAt }' })
  @ApiResponse({ status: 400, description: '필드 검증 실패' })
  @ApiResponse({ status: 403, description: '토큰(x-gu-token) 불일치 · 폼 일시중지' })
  @ApiResponse({ status: 404, description: '폼 없음' })
  submit(@Param('slug') slug: string, @Body() dto: SubmitDto, @Req() req: Request, @Headers(FORM_TOKEN_HEADER) token?: string) {
    return this.svc.submit(slug, dto, requestContext(req), token);
  }

  @Post('f/:slug/events')
  @HttpCode(204)
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @ApiOperation({ summary: '퍼널 이벤트 수집 (form_view / form_start / submit_attempt / submit_error). 주입 스크립트가 sendBeacon 으로 호출' })
  @ApiResponse({ status: 204, description: '기록됨' })
  @ApiResponse({ status: 400, description: 'type/meta 검증 실패' })
  @ApiResponse({ status: 403, description: '토큰(x-gu-token) 불일치 · 폼 일시중지' })
  @ApiResponse({ status: 403, description: '폼 일시중지' })
  @ApiResponse({ status: 404, description: '폼 없음' })
  async event(@Param('slug') slug: string, @Body() dto: EventDto, @Req() req: Request, @Headers(FORM_TOKEN_HEADER) token?: string) {
    await this.svc.recordClientEvent(slug, dto, requestContext(req), token);
  }

  @Get('healthz')
  @SkipThrottle()
  @Header('Cache-Control', 'no-store')
  health() {
    return { ok: true };
  }
}
