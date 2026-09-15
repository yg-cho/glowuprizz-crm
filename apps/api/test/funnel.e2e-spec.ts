import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, login, prisma, resetDb, seedOperator, SAMPLE_HTML } from './helpers';

/**
 * 핵심 성공 흐름: 템플릿 등록 → 캠페인 → 폼 → 채널 링크 → (방문/신청은 DB 직접 삽입: forms 앱 e2e 에서 검증) → 성과/명단 조회
 * + 실패 흐름: 검증 오류, 타 운영자 리소스 접근(IDOR)
 */
describe('Operator funnel (e2e)', () => {
  let app: INestApplication;
  let cookie: string;

  beforeAll(async () => { app = await createApp(); });
  beforeEach(async () => { await resetDb(); await seedOperator(); cookie = await login(app); });
  afterAll(async () => { await app.close(); await prisma.$disconnect(); });

  const upload = (html = SAMPLE_HTML, filename = 'form.html', name?: string) => {
    const req = request(app.getHttpServer()).post('/api/templates').set('Cookie', cookie)
      .attach('file', Buffer.from(html), { filename, contentType: 'text/html' });
    return name ? req.field('name', name) : req;
  };

  describe('HTML 템플릿 등록', () => {
    it('성공: .html + <form> 포함', async () => {
      const res = await upload(SAMPLE_HTML, 'ai-form.html').expect(201);
      expect(res.body).toMatchObject({ name: 'ai-form', sizeBytes: Buffer.byteLength(SAMPLE_HTML) });
      const stored = await prisma.htmlTemplate.findUnique({ where: { id: res.body.id } });
      expect(stored?.html).toBe(SAMPLE_HTML); // 원문 그대로 보관 (스크립트 제거 없음)
    });
    it('실패: 확장자 아님', async () => {
      const res = await upload(SAMPLE_HTML, 'form.txt').expect(400);
      expect(res.body.message).toMatch(/only \.html/);
    });
    it('실패: <form> 없음', async () => {
      const res = await upload('<html><body><h1>no form</h1></body></html>').expect(400);
      expect(res.body.message).toMatch(/<form>/);
    });
    it('실패: 파일 누락', async () => {
      await request(app.getHttpServer()).post('/api/templates').set('Cookie', cookie).field('name', 'x').expect(400);
    });
    it('실패: 크기 초과 (512KB)', async () => {
      const big = '<form></form>' + 'x'.repeat(600 * 1024);
      await upload(big).expect((r) => expect([400, 413]).toContain(r.status));
    });
  });

  describe('캠페인 → 폼 → 링크 → 성과', () => {
    it('성공 흐름 전체', async () => {
      const tpl = (await upload().expect(201)).body;
      const camp = (await request(app.getHttpServer()).post('/api/campaigns').set('Cookie', cookie)
        .send({ name: '9월 캠페인' }).expect(201)).body;

      const form = (await request(app.getHttpServer()).post('/api/forms').set('Cookie', cookie)
        .send({ campaignId: camp.id, templateId: tpl.id, name: '폼A', slug: 'sep-form' }).expect(201)).body;
      expect(form.slug).toBe('sep-form');
      expect(form.status).toBe('ACTIVE');

      const channels = ['INSTAGRAM', 'X', 'YOUTUBE', 'THREADS'];
      const links: Record<string, { id: string; code: string; url: string }> = {};
      for (const channel of channels) {
        const l = (await request(app.getHttpServer()).post('/api/links').set('Cookie', cookie)
          .send({ formId: form.id, channel }).expect(201)).body;
        expect(l.url).toBe(`http://127.0.0.1:3002/l/${l.code}`);
        expect(l.code).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]{8}$/);
        links[channel] = l;
      }
      const listed = (await request(app.getHttpServer()).get(`/api/links?formId=${form.id}`).set('Cookie', cookie).expect(200)).body;
      expect(listed).toHaveLength(4);

      // 방문/신청 데이터 (forms 앱이 기록하는 형태와 동일)
      const v = (vid: string, linkId: string | null) => prisma.event.create({ data: { formId: form.id, linkId, visitorId: vid, type: 'VIEW' } });
      await v('v1', links.INSTAGRAM.id); await v('v1', links.INSTAGRAM.id); // 같은 방문자 2회
      await v('v2', links.INSTAGRAM.id);
      await v('v3', links.YOUTUBE.id);
      await v('v4', null); // 직접 유입
      await prisma.submission.create({ data: { formId: form.id, linkId: links.INSTAGRAM.id, visitorId: 'v1', payload: { name: 'A' } } });
      await prisma.submission.create({ data: { formId: form.id, linkId: links.YOUTUBE.id, visitorId: 'v3', payload: { name: 'B' } } });

      // 캠페인별: 방문 5, 방문자 4, 신청 2, 전환 0.5
      const byCampaign = (await request(app.getHttpServer()).get('/api/stats/campaigns').set('Cookie', cookie).expect(200)).body;
      expect(byCampaign).toEqual([
        { campaignId: camp.id, campaignName: '9월 캠페인', visits: 5, visitors: 4, submissions: 2, conversionRate: 0.5 },
      ]);

      // 채널별: 직접 유입 제외
      const byChannel = (await request(app.getHttpServer()).get('/api/stats/channels').set('Cookie', cookie).expect(200)).body;
      const ch = Object.fromEntries(byChannel.map((r: { channel: string }) => [r.channel, r]));
      expect(ch.INSTAGRAM).toMatchObject({ visits: 3, visitors: 2, submissions: 1, conversionRate: 0.5 });
      expect(ch.YOUTUBE).toMatchObject({ visits: 1, visitors: 1, submissions: 1, conversionRate: 1 });
      expect(ch.X).toMatchObject({ visits: 0, visitors: 0, submissions: 0, conversionRate: 0 });
      expect(ch.THREADS).toMatchObject({ visits: 0, visitors: 0, submissions: 0, conversionRate: 0 });

      // 캠페인 필터
      const filtered = (await request(app.getHttpServer()).get(`/api/stats/channels?campaignId=${camp.id}`).set('Cookie', cookie).expect(200)).body;
      expect(filtered).toEqual(byChannel);

      // overview
      const ov = (await request(app.getHttpServer()).get('/api/stats/overview').set('Cookie', cookie).expect(200)).body;
      expect(ov).toMatchObject({ visits: 5, visitors: 4, submissions: 2, campaigns: 1, forms: 1, conversionRate: 0.5 });

      // CRM 명단
      const subs = (await request(app.getHttpServer()).get(`/api/submissions?campaignId=${camp.id}`).set('Cookie', cookie).expect(200)).body;
      expect(subs.total).toBe(2);
      expect(subs.items[0].form.campaign.id).toBe(camp.id);
      expect(subs.items.map((s: { link: { channel: string } }) => s.link.channel).sort()).toEqual(['INSTAGRAM', 'YOUTUBE']);

      // 링크 삭제 → 기존 데이터 보존 (linkId null)
      await request(app.getHttpServer()).delete(`/api/links/${links.YOUTUBE.id}`).set('Cookie', cookie).expect(204);
      const kept = await prisma.submission.count({ where: { formId: form.id } });
      expect(kept).toBe(2);

      // 폼 일시중지
      await request(app.getHttpServer()).patch(`/api/forms/${form.id}`).set('Cookie', cookie).send({ status: 'PAUSED' }).expect(200);
      expect((await prisma.form.findUnique({ where: { id: form.id } }))?.status).toBe('PAUSED');
    });

    it('실패: 잘못된 채널, 없는 캠페인/템플릿, slug 중복/형식', async () => {
      const tpl = (await upload().expect(201)).body;
      const camp = (await request(app.getHttpServer()).post('/api/campaigns').set('Cookie', cookie).send({ name: 'c' }).expect(201)).body;

      await request(app.getHttpServer()).post('/api/forms').set('Cookie', cookie)
        .send({ campaignId: '00000000-0000-0000-0000-000000000000', templateId: tpl.id, name: 'x' }).expect(404);
      await request(app.getHttpServer()).post('/api/forms').set('Cookie', cookie)
        .send({ campaignId: camp.id, templateId: '00000000-0000-0000-0000-000000000000', name: 'x' }).expect(404);
      await request(app.getHttpServer()).post('/api/forms').set('Cookie', cookie)
        .send({ campaignId: camp.id, templateId: tpl.id, name: 'x', slug: 'Bad Slug!' }).expect(400);

      await request(app.getHttpServer()).post('/api/forms').set('Cookie', cookie)
        .send({ campaignId: camp.id, templateId: tpl.id, name: 'x', slug: 'dup' }).expect(201);
      await request(app.getHttpServer()).post('/api/forms').set('Cookie', cookie)
        .send({ campaignId: camp.id, templateId: tpl.id, name: 'y', slug: 'dup' }).expect(409);

      const form = (await request(app.getHttpServer()).get('/api/forms').set('Cookie', cookie).expect(200)).body[0];
      await request(app.getHttpServer()).post('/api/links').set('Cookie', cookie)
        .send({ formId: form.id, channel: 'TIKTOK' }).expect(400);
      // 화이트리스트 외 필드는 거부
      await request(app.getHttpServer()).post('/api/campaigns').set('Cookie', cookie)
        .send({ name: 'c2', operatorId: 'hijack' }).expect(400);
    });

    it('실패: 다른 운영자의 리소스는 보이지도, 쓰이지도 않음 (IDOR)', async () => {
      const tpl = (await upload().expect(201)).body;
      const camp = (await request(app.getHttpServer()).post('/api/campaigns').set('Cookie', cookie).send({ name: 'mine' }).expect(201)).body;
      const form = (await request(app.getHttpServer()).post('/api/forms').set('Cookie', cookie)
        .send({ campaignId: camp.id, templateId: tpl.id, name: 'f' }).expect(201)).body;
      await prisma.submission.create({ data: { formId: form.id, payload: { secret: 'lead' } } });

      await seedOperator('other@test.com');
      const other = await login(app, 'other@test.com');

      await request(app.getHttpServer()).get(`/api/campaigns/${camp.id}`).set('Cookie', other).expect(404);
      await request(app.getHttpServer()).get(`/api/templates/${tpl.id}`).set('Cookie', other).expect(404);
      await request(app.getHttpServer()).get(`/api/forms/${form.id}`).set('Cookie', other).expect(404);
      await request(app.getHttpServer()).get(`/api/links?formId=${form.id}`).set('Cookie', other).expect(404);
      await request(app.getHttpServer()).get(`/api/submissions?formId=${form.id}`).set('Cookie', other).expect(404);
      await request(app.getHttpServer()).delete(`/api/forms/${form.id}`).set('Cookie', other).expect(404);
      // 남의 캠페인에 내 템플릿으로 폼 만들기 불가
      const myTpl = (await request(app.getHttpServer()).post('/api/templates').set('Cookie', other)
        .attach('file', Buffer.from(SAMPLE_HTML), 'o.html').expect(201)).body;
      await request(app.getHttpServer()).post('/api/forms').set('Cookie', other)
        .send({ campaignId: camp.id, templateId: myTpl.id, name: 'x' }).expect(404);

      const all = (await request(app.getHttpServer()).get('/api/submissions').set('Cookie', other).expect(200)).body;
      expect(all.total).toBe(0);
      const stats = (await request(app.getHttpServer()).get('/api/stats/campaigns').set('Cookie', other).expect(200)).body;
      expect(stats).toEqual([]);
    });
  });
});
