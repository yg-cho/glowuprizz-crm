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
    igCode = (await prisma.distributionLink.create({ data: { formId: form.id, channel: 'INSTAGRAM', code: 'igcode22' } })).code;
    const other = await prisma.form.create({ data: { campaignId: camp.id, templateId: tpl.id, name: 'g', slug: 'other-form' } });
    otherFormCode = (await prisma.distributionLink.create({ data: { formId: other.id, channel: 'X', code: 'xxcode22' } })).code;
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
      expect(res.text).toContain(`linkCode: "${igCode}"`);
      expect(res.text).toContain('<script data-gu-inject>');

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

    it('실패: 없는 코드 404, 일시중지 폼 403 (방문 기록 안 됨)', async () => {
      await request(app.getHttpServer()).get('/l/nope0000').expect(404);
      await prisma.form.update({ where: { id: formId }, data: { status: 'PAUSED' } });
      await request(app.getHttpServer()).get(`/l/${igCode}`).expect(403);
      expect(await prisma.event.count()).toBe(0);
    });

    it('GET /f/:slug 직접 접근은 linkId 없이 기록, linkCode null 주입', async () => {
      const res = await request(app.getHttpServer()).get('/f/my-form').expect(200);
      expect(res.text).toContain('linkCode: null');
      const v = await prisma.event.findFirst({ where: { formId, type: 'VIEW' } });
      expect(v?.linkId).toBeNull();
    });
  });

  describe('POST /f/:slug/submissions', () => {
    it('성공: CRM 명단 저장, 채널 귀속, visitor 연결, 다중값 필드', async () => {
      const visit = await request(app.getHttpServer()).get(`/l/${igCode}`);
      const vid = (visit.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('gu_vid='))!.split(';')[0];

      const res = await request(app.getHttpServer()).post('/f/my-form/submissions').set('Cookie', vid)
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

    it('linkCode 없으면 직접 유입으로 저장', async () => {
      const res = await request(app.getHttpServer()).post('/f/my-form/submissions').send({ fields: { name: 'x' } }).expect(201);
      const s = await prisma.submission.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(s.linkId).toBeNull();
      expect(s.visitorId).toBeNull();
    });

    it('다른 폼의 linkCode 는 무시 (채널 오염 방지)', async () => {
      const res = await request(app.getHttpServer()).post('/f/my-form/submissions')
        .send({ linkCode: otherFormCode, fields: { name: 'x' } }).expect(201);
      const s = await prisma.submission.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(s.formId).toBe(formId);
      expect(s.linkId).toBeNull();
    });

    it('실패: 빈 필드 400, 비문자열 값 400, 필드 과다 400, 없는 폼 404, 일시중지 403', async () => {
      await request(app.getHttpServer()).post('/f/my-form/submissions').send({ fields: {} }).expect(400);
      await request(app.getHttpServer()).post('/f/my-form/submissions').send({ fields: { a: { nested: 1 } } }).expect(400);
      await request(app.getHttpServer()).post('/f/my-form/submissions').send({ fields: 'str' }).expect(400);
      const many = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`f${i}`, 'v']));
      await request(app.getHttpServer()).post('/f/my-form/submissions').send({ fields: many }).expect(400);
      await request(app.getHttpServer()).post('/f/nope/submissions').send({ fields: { a: 'b' } }).expect(404);
      await prisma.form.update({ where: { id: formId }, data: { status: 'PAUSED' } });
      await request(app.getHttpServer()).post('/f/my-form/submissions').send({ fields: { a: 'b' } }).expect(403);
      expect(await prisma.submission.count()).toBe(0);
    });

    it('긴 값은 2000자로 절단', async () => {
      const res = await request(app.getHttpServer()).post('/f/my-form/submissions').send({ fields: { memo: 'x'.repeat(5000) } }).expect(201);
      const s = await prisma.submission.findUniqueOrThrow({ where: { id: res.body.id } });
      expect((s.payload as { memo: string }).memo).toHaveLength(2000);
    });
  });

  it('forms 앱에는 관리자 라우트가 존재하지 않음', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(404);
    await request(app.getHttpServer()).get('/api/submissions').expect(404);
    await request(app.getHttpServer()).get('/api/templates').expect(404);
  });
});
