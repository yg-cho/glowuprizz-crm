import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaClient } from '@glowuprizz/db';
import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();

const HTML = `<!doctype html><html><head><title>t</title></head><body>
<form id="f"><input name="name"/><input name="tags" value="a"/><input name="tags" value="b"/><button type="submit">go</button></form>
<script>window.__opJs = 1</script>
</body></html>`;

describe('Public forms (e2e)', () => {
  let app: INestApplication;
  let formId: string;
  let igCode: string;
  let otherFormCode: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });
  afterAll(async () => { await app.close(); await prisma.$disconnect(); });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE submissions, events, distribution_links, forms, campaigns, html_templates, operators RESTART IDENTITY CASCADE');
    const op = await prisma.operator.create({ data: { email: 'op@test.com', passwordHash: 'x' } });
    const tpl = await prisma.htmlTemplate.create({ data: { operatorId: op.id, name: 't', html: HTML, sizeBytes: HTML.length } });
    const camp = await prisma.campaign.create({ data: { operatorId: op.id, name: 'c' } });
    const form = await prisma.form.create({ data: { campaignId: camp.id, templateId: tpl.id, name: 'f', slug: 'my-form' } });
    formId = form.id;
    igCode = (await prisma.distributionLink.create({ data: { formId: form.id, channel: 'INSTAGRAM', code: 'kgcdee22' } })).code;
    const other = await prisma.form.create({ data: { campaignId: camp.id, templateId: tpl.id, name: 'g', slug: 'other-form' } });
    otherFormCode = (await prisma.distributionLink.create({ data: { formId: other.id, channel: 'X', code: 'xxcdee22' } })).code;
  });

  describe('GET /l/:code', () => {
    it('성공: 방문 기록, visitor 쿠키 발급, 원본 HTML + 주입 스크립트, CSP 헤더', async () => {
      const res = await request(app.getHttpServer()).get(`/l/${igCode}`).expect(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);

      const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('gu_vid='))!;
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/Max-Age=31536000/);

      // 원본 보존 + 스크립트 주입
      expect(res.text).toContain('window.__opJs = 1');
      expect(res.text).toContain('/f/my-form/submissions');
      expect(res.text).toContain('/f/my-form/events'); // 퍼널 이벤트 비콘
      for (const t of ['form_view', 'form_start', 'submit_attempt', 'submit_error']) expect(res.text).toContain(`'${t}'`);
      expect(res.text).toContain(`var LINK = "${igCode}"`);
      expect(res.text).toContain('<script data-gu-inject>');
      expect(res.text).toMatch(/var TOKEN = "[A-Za-z0-9_-]{40,}"/);

      // 격리 헤더
      const csp = res.headers['content-security-policy'];
      expect(csp).toContain("script-src 'self' 'unsafe-inline' https:");
      expect(csp).toContain("connect-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("form-action 'self'");
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['cache-control']).toBe('no-store');

      const visits = await prisma.event.findMany({ where: { formId, type: 'VIEW' } });
      expect(visits).toHaveLength(1);
      expect(visits[0].linkId).not.toBeNull();
      expect(visits[0].visitorId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('같은 visitor 쿠키로 재방문 → 방문 2, 고유 방문자 1', async () => {
      const first = await request(app.getHttpServer()).get(`/l/${igCode}`).expect(200);
      const vid = (first.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('gu_vid='))!.split(';')[0];
      const second = await request(app.getHttpServer()).get(`/l/${igCode}`).set('Cookie', vid).expect(200);
      expect(second.headers['set-cookie']).toBeUndefined(); // 재발급 없음
      const distinct = await prisma.event.findMany({ where: { formId, type: 'VIEW' }, distinct: ['visitorId'] });
      expect(await prisma.event.count({ where: { formId, type: 'VIEW' } })).toBe(2);
      expect(distinct).toHaveLength(1);
    });

    it('실패: 없는 코드 404, 일시중지 폼은 403 안내 HTML (방문 기록 안 됨)', async () => {
      await request(app.getHttpServer()).get('/l/nope0000').expect(404);
      await prisma.form.update({ where: { id: formId }, data: { status: 'PAUSED' } });
      const r = await request(app.getHttpServer()).get(`/l/${igCode}`).expect(403);
      expect(r.headers['content-type']).toMatch(/text\/html/);
      expect(r.text).toContain('신청이 마감되었습니다');
      expect(await prisma.event.count()).toBe(0);
    });

    it('HEAD 요청은 렌더하지만 VIEW 를 기록하지 않음', async () => {
      await request(app.getHttpServer()).head(`/l/${igCode}`).expect(200);
      expect(await prisma.event.count({ where: { formId, type: 'VIEW' } })).toBe(0);
    });

    it('주입 위치: 문자열 안의 </body> 가 아닌 마지막 </body> 앞', async () => {
      const tricky = `<html><body><script>var s = "</body>";</script><form><input name="a"/></form></body></html>`;
      await prisma.htmlTemplate.updateMany({ data: { html: tricky } });
      const res = await request(app.getHttpServer()).get(`/l/${igCode}`).expect(200);
      const idx = res.text.indexOf('<script data-gu-inject>');
      expect(idx).toBeGreaterThan(res.text.indexOf('<form'));
      expect(res.text.lastIndexOf('</body>')).toBeGreaterThan(idx);
    });

    it('GET /f/:slug 직접 접근은 linkId 없이 기록, linkCode null 주입', async () => {
      const res = await request(app.getHttpServer()).get('/f/my-form').expect(200);
      expect(res.text).toContain('var LINK = null');
      const v = await prisma.event.findFirst({ where: { formId, type: 'VIEW' } });
      expect(v?.linkId).toBeNull();
    });
  });

  /** 페이지를 한 번 렌더해 방문자 쿠키와 주입된 토큰을 얻는다 (실제 브라우저와 같은 경로) */
  const session = async (path = `/l/${igCode}`) => {
    const r = await request(app.getHttpServer()).get(path).expect(200);
    const cookie = (r.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('gu_vid='))!.split(';')[0];
    const token = /var TOKEN = "([^"]+)"/.exec(r.text)![1];
    return { cookie, token, vid: cookie.split('=')[1] };
  };
  const post = (path: string, s: { cookie: string; token: string }) => request(app.getHttpServer()).post(path).set('Cookie', s.cookie).set('x-gu-token', s.token);

  describe('POST /f/:slug/submissions', () => {
    it('성공: CRM 명단 저장, 채널 귀속, visitor 연결, 다중값 필드', async () => {
      const ses = await session();
      const vid = ses.cookie;

      const res = await post('/f/my-form/submissions', ses)
        .send({ linkCode: igCode, fields: { name: '홍길동', tags: ['a', 'b'] } }).expect(201);
      expect(res.body).toHaveProperty('id');

      const s = await prisma.submission.findUniqueOrThrow({ where: { id: res.body.id }, include: { link: true } });
      expect(s.payload).toEqual({ name: '홍길동', tags: ['a', 'b'] });
      expect(s.link?.channel).toBe('INSTAGRAM');
      expect(s.visitorId).toBe(vid.split('=')[1]);
      expect(s.ipHash).toBeTruthy();
      const ev = await prisma.event.findFirst({ where: { formId, type: 'SUBMIT_SUCCESS' } });
      expect(ev?.visitorId).toBe(s.visitorId);
      expect(ev?.linkId).toBe(s.linkId);
    });

    it('linkCode 없으면 직접 유입으로 저장 (방문자는 항상 연결됨)', async () => {
      const ses = await session('/f/my-form');
      const res = await post('/f/my-form/submissions', ses).send({ fields: { name: 'x' } }).expect(201);
      const s = await prisma.submission.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(s.linkId).toBeNull();
      expect(s.visitorId).toBe(ses.vid);
    });

    it('토큰 없음 / 다른 slug 토큰 / 쿠키 위조 → 403 (교차 제출·방문자 위조 차단)', async () => {
      const ses = await session();
      await request(app.getHttpServer()).post('/f/my-form/submissions').set('Cookie', ses.cookie).send({ fields: { a: 'b' } }).expect(403);
      // 같은 origin 의 다른 폼(other-form) 페이지에서 받은 토큰으로 my-form 에 제출 시도
      const other = await session(`/l/${otherFormCode}`);
      await request(app.getHttpServer()).post('/f/my-form/submissions').set('Cookie', other.cookie).set('x-gu-token', other.token).send({ fields: { a: 'b' } }).expect(403);
      // 토큰은 맞지만 쿠키를 다른 UUID 로 바꿈
      await request(app.getHttpServer()).post('/f/my-form/submissions').set('Cookie', 'gu_vid=11111111-1111-4111-8111-111111111111').set('x-gu-token', ses.token).send({ fields: { a: 'b' } }).expect(403);
      expect(await prisma.submission.count()).toBe(0);
    });

    it('필드 키 형식 검증: 공백·특수문자·100자 초과·__proto__ 거부', async () => {
      const ses = await session();
      await post('/f/my-form/submissions', ses).send({ fields: { 'bad key!': 'x' } }).expect(400);
      await post('/f/my-form/submissions', ses).send({ fields: { ['k'.repeat(101)]: 'x' } }).expect(400);
      await post('/f/my-form/submissions', ses).send({ fields: { __proto__: ['x'] } }).expect(400);
      await post('/f/my-form/submissions', ses).send({ fields: { 'name[]': 'ok', 'a.b-c': 'ok' } }).expect(201);
    });

    it('다른 폼의 linkCode 는 무시 (채널 오염 방지)', async () => {
      const ses = await session();
      const res = await post('/f/my-form/submissions', ses)
        .send({ linkCode: otherFormCode, fields: { name: 'x' } }).expect(201);
      const s = await prisma.submission.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(s.formId).toBe(formId);
      expect(s.linkId).toBeNull();
    });

    it('실패: 빈 필드 400, 비문자열 값 400, 필드 과다 400, 없는 폼 404, 일시중지 403', async () => {
      const ses = await session();
      await post('/f/my-form/submissions', ses).send({ fields: {} }).expect(400);
      await post('/f/my-form/submissions', ses).send({ fields: { a: { nested: 1 } } }).expect(400);
      await post('/f/my-form/submissions', ses).send({ fields: 'str' }).expect(400);
      const many = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`f${i}`, 'v']));
      await post('/f/my-form/submissions', ses).send({ fields: many }).expect(400);
      await post('/f/nope/submissions', ses).send({ fields: { a: 'b' } }).expect(403); // slug 불일치 토큰
      await prisma.form.update({ where: { id: formId }, data: { status: 'PAUSED' } });
      await post('/f/my-form/submissions', ses).send({ fields: { a: 'b' } }).expect(403);
      expect(await prisma.submission.count()).toBe(0);
    });

    it('긴 값은 2000자로 절단', async () => {
      const ses = await session();
      const res = await post('/f/my-form/submissions', ses).send({ fields: { memo: 'x'.repeat(5000) } }).expect(201);
      const s = await prisma.submission.findUniqueOrThrow({ where: { id: res.body.id } });
      expect((s.payload as { memo: string }).memo).toHaveLength(2000);
    });
  });

  describe('POST /f/:slug/events', () => {
    it('성공: 클라이언트 이벤트 4종 기록, 채널 귀속, meta 는 타입별 허용 키만', async () => {
      const ses = await session();
      for (const [type, meta] of [['form_view', { fields: 3, junk: 'x' }], ['form_start', { field: 'name' }], ['submit_attempt', { fields: 2 }], ['submit_error', { reason: 'http', status: 400 }]] as const) {
        await post('/f/my-form/events', ses).send({ linkCode: igCode, type, meta }).expect(204);
      }
      const events = await prisma.event.findMany({ where: { formId }, orderBy: { createdAt: 'asc' }, include: { link: true } });
      expect(events.map((e) => e.type)).toEqual(['VIEW', 'FORM_VIEW', 'FORM_START', 'SUBMIT_ATTEMPT', 'SUBMIT_ERROR']);
      expect(events.every((e) => e.visitorId === ses.vid)).toBe(true);
      expect(events.every((e) => e.link?.channel === 'INSTAGRAM')).toBe(true);
      expect(events[1].meta).toEqual({ fields: 3 }); // junk 제거
      expect(events[2].meta).toEqual({ field: 'name' });
      expect(events[4].meta).toEqual({ reason: 'http', status: 400 });
    });

    it('meta 정규화: 잘못된 타입은 null, reason 은 http|network 만, 문자열 100자 절단', async () => {
      const ses = await session();
      await post('/f/my-form/events', ses).send({ type: 'submit_error', meta: { reason: 'weird', status: 'abc' } }).expect(204);
      await post('/f/my-form/events', ses).send({ type: 'form_start', meta: { field: 'f'.repeat(300) } }).expect(204);
      const [err, start] = await Promise.all([prisma.event.findFirst({ where: { type: 'SUBMIT_ERROR' } }), prisma.event.findFirst({ where: { type: 'FORM_START' } })]);
      expect(err?.meta).toEqual({ reason: 'http', status: null });
      expect((start?.meta as { field: string }).field).toHaveLength(100);
    });

    it('토큰 없음 / 쿠키 없음 / 다른 slug 토큰 → 403, 기록 없음', async () => {
      const ses = await session();
      await request(app.getHttpServer()).post('/f/my-form/events').set('Cookie', ses.cookie).send({ type: 'form_view' }).expect(403);
      await request(app.getHttpServer()).post('/f/my-form/events').set('x-gu-token', ses.token).send({ type: 'form_view' }).expect(403);
      const other = await session(`/l/${otherFormCode}`);
      await request(app.getHttpServer()).post('/f/my-form/events').set('Cookie', other.cookie).set('x-gu-token', other.token).send({ type: 'form_view' }).expect(403);
      expect(await prisma.event.count({ where: { type: 'FORM_VIEW' } })).toBe(0);
    });

    it('실패: 서버 전용 타입(view/submit_success)·미지 타입 400, meta 1KB 초과 400, 일시중지 403', async () => {
      const ses = await session();
      await post('/f/my-form/events', ses).send({ type: 'view' }).expect(400);
      await post('/f/my-form/events', ses).send({ type: 'submit_success' }).expect(400);
      await post('/f/my-form/events', ses).send({ type: 'form_start', meta: { x: 'y'.repeat(2000) } }).expect(400);
      await prisma.form.update({ where: { id: formId }, data: { status: 'PAUSED' } });
      await post('/f/my-form/events', ses).send({ type: 'form_view' }).expect(403);
    });

    it('다른 폼의 linkCode 는 귀속하지 않음', async () => {
      const ses = await session();
      await post('/f/my-form/events', ses).send({ linkCode: otherFormCode, type: 'form_view' }).expect(204);
      const e = await prisma.event.findFirst({ where: { type: 'FORM_VIEW' } });
      expect(e?.linkId).toBeNull();
    });
  });

  it('forms 앱에는 관리자 라우트가 존재하지 않음', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(404);
    await request(app.getHttpServer()).get('/api/submissions').expect(404);
    await request(app.getHttpServer()).get('/api/templates').expect(404);
  });
});
