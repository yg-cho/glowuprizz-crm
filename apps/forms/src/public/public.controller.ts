import { Body, Controller, Get, Header, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Throttle } from '@nestjs/throttler';
import { VISITOR_COOKIE, isSecureRequest } from '@glowuprizz/shared';
import { PublicService } from './public.service';
import { SubmitDto } from './dto/submit.dto';
import { EventDto } from './dto/event.dto';
import { buildCsp, buildInjectScript, injectScript } from './inject';

const VISITOR_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 365;

@ApiTags('public')
@Controller()
export class PublicController {
  constructor(private readonly svc: PublicService) {}

  private ensureVisitor(req: Request, res: Response): string {
    let vid: string | undefined = req.cookies?.[VISITOR_COOKIE];
    if (!vid || !/^[0-9a-f-]{36}$/.test(vid)) {
      vid = randomUUID();
      res.cookie(VISITOR_COOKIE, vid, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isSecureRequest(req), // http 로컬/compose 에서도 쿠키가 살도록 요청 기준
        maxAge: VISITOR_COOKIE_MAX_AGE,
        path: '/',
      });
    }
    return vid;
  }

  private visitorIdFrom(req: Request): string | null {
    const vid: string | undefined = req.cookies?.[VISITOR_COOKIE];
    return vid && /^[0-9a-f-]{36}$/.test(vid) ? vid : null;
  }

  private render(res: Response, html: string, slug: string, linkCode: string | null) {
    const out = injectScript(html, buildInjectScript(slug, linkCode));
    res.setHeader('Content-Security-Policy', buildCsp());
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store');
    res.type('html').send(out);
  }

  @Get('l/:code')
  @ApiOperation({ summary: '채널 배포 링크. 방문 기록 후 폼 HTML 렌더 (스크립트 주입, CSP 적용)' })
  @ApiResponse({ status: 200, description: 'text/html' })
  @ApiResponse({ status: 404, description: '링크 없음' })
  @ApiResponse({ status: 403, description: '폼 일시중지' })
  async byLink(@Param('code') code: string, @Req() req: Request, @Res() res: Response) {
    const link = await this.svc.resolveLink(code);
    const visitorId = this.ensureVisitor(req, res);
    await this.svc.recordVisit({ formId: link.formId, linkId: link.id, visitorId, ip: req.ip, userAgent: req.headers['user-agent'] });
    this.render(res, link.form.template.html, link.form.slug, link.code);
  }

  @Get('f/:slug')
  @ApiOperation({ summary: '폼 직접 접근 (채널 없음). 방문 기록 후 렌더' })
  async bySlug(@Param('slug') slug: string, @Req() req: Request, @Res() res: Response) {
    const form = await this.svc.resolveForm(slug);
    const visitorId = this.ensureVisitor(req, res);
    await this.svc.recordVisit({ formId: form.id, linkId: null, visitorId, ip: req.ip, userAgent: req.headers['user-agent'] });
    this.render(res, form.template.html, form.slug, null);
  }

  @Post('f/:slug/submissions')
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: '공개 폼 제출. 주입 스크립트가 호출. CRM 명단에 저장' })
  @ApiResponse({ status: 201, description: '저장됨 { id, createdAt }' })
  @ApiResponse({ status: 400, description: '필드 검증 실패' })
  @ApiResponse({ status: 403, description: '폼 일시중지' })
  @ApiResponse({ status: 404, description: '폼 없음' })
  async submit(@Param('slug') slug: string, @Body() dto: SubmitDto, @Req() req: Request) {
    return this.svc.submit(slug, dto.linkCode ?? null, dto.fields, this.visitorIdFrom(req), req.ip);
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
    await this.svc.recordClientEvent(slug, dto, this.visitorIdFrom(req), req.ip, req.headers['user-agent']);
  }

  @Get('healthz')
  @Header('Cache-Control', 'no-store')
  health() {
    return { ok: true };
  }
}
