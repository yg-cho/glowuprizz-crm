import { Body, Controller, Get, Header, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
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
  constructor(private readonly svc: PublicService) {}

  /**
   * 폼 페이지 서빙 공통 경로: 방문자 쿠키 → VIEW 이벤트 → 스크립트 주입 → CSP 헤더 → HTML.
   * 링크 경유(/l/:code)와 직접 접근(/f/:slug)의 차이는 linkId/linkCode 만.
   */
  private async serve(req: Request, res: Response, form: { id: string; slug: string; template: { html: string } }, link: { id: string; code: string } | null) {
    const visitorId = ensureVisitorId(req, res);
    await this.svc.recordView(form.id, link?.id ?? null, visitorId, requestContext(req, visitorId));
    const html = injectScript(form.template.html, buildInjectScript(form.slug, link?.code ?? null));
    res.setHeader('Content-Security-Policy', buildCsp());
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    res.type('html').send(html);
  }

  @Get('l/:code')
  @ApiOperation({ summary: '채널 배포 링크. 방문(VIEW) 기록 후 폼 HTML 렌더 (스크립트 주입, CSP 적용)' })
  @ApiResponse({ status: 200, description: 'text/html' })
  @ApiResponse({ status: 404, description: '링크 없음' })
  @ApiResponse({ status: 403, description: '폼 일시중지' })
  async byLink(@Param('code') code: string, @Req() req: Request, @Res() res: Response) {
    const link = await this.svc.resolveLink(code);
    await this.serve(req, res, link.form, link);
  }

  @Get('f/:slug')
  @ApiOperation({ summary: '폼 직접 접근 (채널 없음). 방문 기록 후 렌더' })
  async bySlug(@Param('slug') slug: string, @Req() req: Request, @Res() res: Response) {
    const form = await this.svc.resolveForm(slug);
    await this.serve(req, res, form, null);
  }

  @Post('f/:slug/submissions')
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: '공개 폼 제출. 주입 스크립트가 호출. CRM 명단 + SUBMIT_SUCCESS 이벤트' })
  @ApiResponse({ status: 201, description: '저장됨 { id, createdAt }' })
  @ApiResponse({ status: 400, description: '필드 검증 실패' })
  @ApiResponse({ status: 403, description: '폼 일시중지' })
  @ApiResponse({ status: 404, description: '폼 없음' })
  submit(@Param('slug') slug: string, @Body() dto: SubmitDto, @Req() req: Request) {
    return this.svc.submit(slug, dto, requestContext(req));
  }

  @Post('f/:slug/events')
  @HttpCode(204)
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @ApiOperation({ summary: '퍼널 이벤트 수집 (form_view / form_start / submit_attempt / submit_error). 주입 스크립트가 sendBeacon 으로 호출' })
  @ApiResponse({ status: 204, description: '기록됨 (방문자 쿠키 없으면 무시)' })
  @ApiResponse({ status: 400, description: 'type/meta 검증 실패' })
  @ApiResponse({ status: 403, description: '폼 일시중지' })
  @ApiResponse({ status: 404, description: '폼 없음' })
  async event(@Param('slug') slug: string, @Body() dto: EventDto, @Req() req: Request) {
    await this.svc.recordClientEvent(slug, dto, requestContext(req));
  }

  @Get('healthz')
  @Header('Cache-Control', 'no-store')
  health() {
    return { ok: true };
  }
}
