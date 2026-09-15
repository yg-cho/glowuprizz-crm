import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EventType } from '@glowuprizz/db';
import { createApp, login, prisma, resetDb, seedOperator, SAMPLE_HTML } from './helpers';

/**
 * 퍼널 집계 API. 이벤트를 시각까지 고정해 넣고 단계·전환·기간·채널·링크·폼·품질·여정을 검증한다.
 * 기준: 2026-09-10 ~ 09-16 (KST). 오늘 = 2026-09-16 가정은 하지 않고 range=custom 으로 고정한다.
 */
describe('Funnel stats (e2e)', () => {
  let app: INestApplication;
  let cookie: string;
  let campId: string, formA: string, formB: string, igLink: string, ytLink: string, xLink: string;

  const at = (day: string, hourKst = 12) => new Date(`${day}T${String(hourKst).padStart(2, '0')}:00:00+09:00`);
  const ev = (formId: string, linkId: string | null, visitorId: string, type: EventType, createdAt: Date, meta?: object) =>
    prisma.event.create({ data: { formId, linkId, visitorId, type, createdAt, meta: meta as never } });
  const RANGE = { range: 'custom', from: '2026-09-10T00:00:00+09:00', to: '2026-09-17T00:00:00+09:00' };
  const qs = (extra: Record<string, string> = {}) => new URLSearchParams({ ...RANGE, ...extra }).toString();
  const get = (path: string) => request(app.getHttpServer()).get(path).set('Cookie', cookie);

  beforeAll(async () => {
    app = await createApp();
    await resetDb();
    const op = await seedOperator();
    cookie = await login(app);
    const tpl = await prisma.htmlTemplate.create({ data: { operatorId: op.id, name: 't', html: SAMPLE_HTML, sizeBytes: 10 } });
    const camp = await prisma.campaign.create({ data: { operatorId: op.id, name: '9월 캠페인' } });
    campId = camp.id;
    formA = (await prisma.form.create({ data: { campaignId: camp.id, templateId: tpl.id, name: '폼 A', slug: 'a' } })).id;
    formB = (await prisma.form.create({ data: { campaignId: camp.id, templateId: tpl.id, name: '폼 B', slug: 'b' } })).id;
    igLink = (await prisma.distributionLink.create({ data: { formId: formA, channel: 'INSTAGRAM', code: 'igaaaaaa' } })).id;
    ytLink = (await prisma.distributionLink.create({ data: { formId: formA, channel: 'YOUTUBE', code: 'ytaaaaaa' } })).id;
    xLink = (await prisma.distributionLink.create({ data: { formId: formB, channel: 'X', code: 'xbbbbbbb' } })).id;

    // v1 (인스타, 폼A): 완주. 9/12 20시. 2회 방문(재방문 후 신청)
    await ev(formA, igLink, 'v1', 'VIEW', at('2026-09-12', 20));
    await ev(formA, igLink, 'v1', 'FORM_VIEW', at('2026-09-12', 20));
    await ev(formA, igLink, 'v1', 'VIEW', at('2026-09-12', 21));
    await ev(formA, igLink, 'v1', 'FORM_VIEW', at('2026-09-12', 21));
    await ev(formA, igLink, 'v1', 'FORM_START', at('2026-09-12', 21), { field: 'name' });
    await ev(formA, igLink, 'v1', 'SUBMIT_ATTEMPT', at('2026-09-12', 21));
    const sub1 = await prisma.submission.create({ data: { formId: formA, linkId: igLink, visitorId: 'v1', payload: { name: 'A', phone: '010-1111-2222' }, createdAt: at('2026-09-12', 21) } });
    await ev(formA, igLink, 'v1', 'SUBMIT_SUCCESS', at('2026-09-12', 21), { submissionId: sub1.id }); // forms 가 넣는 형태
    // v2 (인스타, 폼A): 작성 시작만 (미신청) 9/13
    await ev(formA, igLink, 'v2', 'VIEW', at('2026-09-13', 10));
    await ev(formA, igLink, 'v2', 'FORM_VIEW', at('2026-09-13', 10));
    await ev(formA, igLink, 'v2', 'FORM_START', at('2026-09-13', 10), { field: 'phone' });
    // v3 (유튜브, 폼A): 제출 실패 후 성공 9/14
    await ev(formA, ytLink, 'v3', 'VIEW', at('2026-09-14', 9));
    await ev(formA, ytLink, 'v3', 'FORM_VIEW', at('2026-09-14', 9));
    await ev(formA, ytLink, 'v3', 'FORM_START', at('2026-09-14', 9));
    await ev(formA, ytLink, 'v3', 'SUBMIT_ATTEMPT', at('2026-09-14', 9));
    await ev(formA, ytLink, 'v3', 'SUBMIT_ERROR', at('2026-09-14', 9), { reason: 'network' });
    await ev(formA, ytLink, 'v3', 'SUBMIT_ATTEMPT', at('2026-09-14', 9));
    const sub3 = await prisma.submission.create({ data: { formId: formA, linkId: ytLink, visitorId: 'v3', payload: { name: 'C', phone: '01011112222' }, createdAt: at('2026-09-14', 9) } }); // v1 과 같은 번호(중복)
    await ev(formA, ytLink, 'v3', 'SUBMIT_SUCCESS', at('2026-09-14', 9), { submissionId: sub3.id });
    // v4 (X, 폼B): 클릭만 (봇 의심) 9/14
    await ev(formB, xLink, 'v4', 'VIEW', at('2026-09-14', 15));
    // v5 (직접 유입, 폼B): 폼 도달까지 9/15
    await ev(formB, null, 'v5', 'VIEW', at('2026-09-15', 11));
    await ev(formB, null, 'v5', 'FORM_VIEW', at('2026-09-15', 11));
    // v0: 기간 밖 (9/1) — 어떤 집계에도 안 잡혀야 함
    await ev(formA, igLink, 'v0', 'VIEW', at('2026-09-01', 12));
    await ev(formA, igLink, 'v0', 'SUBMIT_SUCCESS', at('2026-09-01', 12));
  });
  afterAll(async () => { await app.close(); await prisma.$disconnect(); });

  it('funnel: 단계별 고유 방문자·전환율·최대 이탈, 기간 밖 제외', async () => {
    const r = (await get(`/api/stats/funnel?${qs()}`).expect(200)).body;
    const by = Object.fromEntries(r.current.stages.map((s: { type: string }) => [s.type, s]));
    expect(by.VIEW.visitors).toBe(5);          // v1 v2 v3 v4 v5
    expect(by.FORM_VIEW.visitors).toBe(4);     // v4 제외
    expect(by.FORM_START.visitors).toBe(3);    // v1 v2 v3
    expect(by.SUBMIT_ATTEMPT.visitors).toBe(2);
    expect(by.SUBMIT_SUCCESS.visitors).toBe(2);
    expect(by.FORM_VIEW.stepRate).toBe(0.8);
    expect(by.SUBMIT_SUCCESS.cumulativeRate).toBe(0.4);
    expect(r.current.pageViews).toBe(6);        // v1 두 번
    expect(r.current.submitErrors).toBe(1);
    expect(r.current.overallRate).toBe(0.4);
    expect(['FORM_VIEW', 'FORM_START', 'SUBMIT_ATTEMPT']).toContain(r.current.maxDropStage);
    expect(r.previous).toBeNull();
  });

  it('funnel: compare=1 이면 직전 기간(9/3~9/10) 포함 — 9/1 은 거기에도 없음', async () => {
    const r = (await get(`/api/stats/funnel?${qs({ compare: '1' })}`).expect(200)).body;
    expect(r.previous).not.toBeNull();
    expect(r.previous.stages[0].visitors).toBe(0);
  });

  it('funnel: 필터 — formId=폼B 는 v4 v5 만, channel=INSTAGRAM 은 v1 v2 만', async () => {
    const b = (await get(`/api/stats/funnel?${qs({ formId: formB })}`).expect(200)).body;
    expect(b.current.stages[0].visitors).toBe(2);
    expect(b.current.stages[4].visitors).toBe(0);
    const ig = (await get(`/api/stats/funnel?${qs({ channel: 'INSTAGRAM' })}`).expect(200)).body;
    expect(ig.current.stages[0].visitors).toBe(2);
    expect(ig.current.stages[4].visitors).toBe(1);
  });

  it('timeseries: 날짜별(KST) 채움, 빈 날 0', async () => {
    const r = (await get(`/api/stats/timeseries?${qs()}`).expect(200)).body;
    expect(r).toHaveLength(7);
    expect(r.map((d: { day: string }) => d.day)).toEqual(['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16']);
    const d = Object.fromEntries(r.map((x: { day: string }) => [x.day, x]));
    expect(d['2026-09-12']).toMatchObject({ visitors: 1, formStarts: 1, submissions: 1, conversionRate: 1 });
    expect(d['2026-09-14']).toMatchObject({ visitors: 2, submissions: 1, conversionRate: 0.5 });
    expect(d['2026-09-11']).toMatchObject({ visitors: 0, submissions: 0 });
  });

  it('timeseries: KST 자정에 정렬되지 않은 custom 기간도 마지막 날 데이터를 잃지 않음, 날짜만 온 from/to 는 KST 로', async () => {
    // 9/12 06:00 KST ~ 9/14 18:00 KST → 9/12·9/13·9/14 전부 나와야 함 (v3 는 9/14 09:00)
    const r = (await get(`/api/stats/timeseries?range=custom&from=2026-09-12T06:00:00%2B09:00&to=2026-09-14T18:00:00%2B09:00`).expect(200)).body;
    expect(r.map((d: { day: string }) => d.day)).toEqual(['2026-09-12', '2026-09-13', '2026-09-14']);
    expect(r[2]).toMatchObject({ submissions: 1 });
    // 날짜만: 2026-09-14 ~ 2026-09-15 = KST 9/14 하루 → v3, v4 = 방문자 2
    const d = (await get(`/api/stats/funnel?range=custom&from=2026-09-14&to=2026-09-15`).expect(200)).body;
    expect(d.current.stages[0].visitors).toBe(2);
  });

  it('quality: 중복 전화번호가 채널 필터를 따름 (인스타만 보면 v1 하나 → 중복 0)', async () => {
    const all = (await get(`/api/stats/quality?${qs()}`).expect(200)).body;
    expect(all.duplicatePhones).toBe(1);
    const ig = (await get(`/api/stats/quality?${qs({ channel: 'INSTAGRAM' })}`).expect(200)).body;
    expect(ig.duplicatePhones).toBe(0);
  });

  it('visitors: 중간 단계 비콘이 빠져도 상위 단계가 있으면 도달로 인정, total 은 페이지와 무관', async () => {
    // v8: FORM_START 없이 SUBMIT_ATTEMPT 만 (비콘 유실)
    await ev(formB, xLink, 'v8', 'VIEW', at('2026-09-13', 12));
    await ev(formB, xLink, 'v8', 'SUBMIT_ATTEMPT', at('2026-09-13', 12));
    const r = (await get(`/api/stats/visitors?${qs({ stage: 'FORM_START', submitted: 'false' })}`).expect(200)).body;
    expect(r.items.map((i: { visitorId: string }) => i.visitorId).sort()).toEqual(['v2', 'v8']);
    expect(r.items.find((i: { visitorId: string }) => i.visitorId === 'v8').lastStage).toBe('SUBMIT_ATTEMPT');
    const page2 = (await get(`/api/stats/visitors?${qs({ stage: 'FORM_START', submitted: 'false', page: '5', pageSize: '1' })}`).expect(200)).body;
    expect(page2.total).toBe(2);
    expect(page2.items).toHaveLength(0);
    await prisma.event.deleteMany({ where: { visitorId: 'v8' } });
  });

  it('channels: 4채널 고정, 직접 유입 제외, 기여도', async () => {
    const r = (await get(`/api/stats/channels?${qs()}`).expect(200)).body;
    const c = Object.fromEntries(r.map((x: { channel: string }) => [x.channel, x]));
    expect(Object.keys(c).sort()).toEqual(['INSTAGRAM', 'THREADS', 'X', 'YOUTUBE']);
    expect(c.INSTAGRAM).toMatchObject({ VIEW: 2, FORM_START: 2, SUBMIT_SUCCESS: 1, pageViews: 3, clickToSubmit: 0.5, startToSubmit: 0.5, share: 0.5 });
    expect(c.YOUTUBE).toMatchObject({ VIEW: 1, SUBMIT_SUCCESS: 1, submitErrors: 1, share: 0.5 });
    expect(c.X).toMatchObject({ VIEW: 1, FORM_VIEW: 0, SUBMIT_SUCCESS: 0 });
    expect(c.THREADS).toMatchObject({ VIEW: 0 });
  });

  it('campaigns / links / forms: 그룹별 단계 수', async () => {
    const camps = (await get(`/api/stats/campaigns?${qs()}`).expect(200)).body;
    expect(camps).toHaveLength(1);
    expect(camps[0]).toMatchObject({ campaignId: campId, VIEW: 5, SUBMIT_SUCCESS: 2, conversionRate: 0.4, formsCount: 2, linksCount: 3, pageViews: 6 });

    const links = (await get(`/api/stats/links?${qs({ campaignId: campId })}`).expect(200)).body;
    const l = Object.fromEntries(links.map((x: { code: string }) => [x.code, x]));
    expect(l.igaaaaaa).toMatchObject({ channel: 'INSTAGRAM', VIEW: 2, SUBMIT_SUCCESS: 1, conversionRate: 0.5 });
    expect(l.ytaaaaaa).toMatchObject({ VIEW: 1, SUBMIT_SUCCESS: 1, conversionRate: 1 });
    expect(l.xbbbbbbb).toMatchObject({ VIEW: 1, SUBMIT_SUCCESS: 0 });

    const forms = (await get(`/api/stats/forms?${qs({ campaignId: campId })}`).expect(200)).body;
    const f = Object.fromEntries(forms.map((x: { slug: string }) => [x.slug, x]));
    expect(f.a.overallRate).toBeCloseTo(2 / 3, 4);
    expect(f.b.overallRate).toBe(0);
    expect(f.a.stages[1]).toMatchObject({ type: 'FORM_VIEW', stepRate: 1 });
    expect(f.b.stages[1]).toMatchObject({ type: 'FORM_VIEW', stepRate: 0.5 });
  });

  it('heatmap: KST 요일×시간 (9/12 토 20시·21시, 9/14 월 9시·15시)', async () => {
    const r = (await get(`/api/stats/heatmap?${qs()}`).expect(200)).body;
    expect(r.grid).toHaveLength(7);
    expect(r.grid[6][20]).toBe(1); // 토 20시 v1
    expect(r.grid[6][21]).toBe(1); // 토 21시 v1 재방문
    expect(r.grid[1][9]).toBe(1);  // 월 9시 v3
    expect(r.grid[1][15]).toBe(1); // 월 15시 v4
    expect(r.max).toBe(1);
  });

  it('failures / quality / insights', async () => {
    const fails = (await get(`/api/stats/failures?${qs()}`).expect(200)).body;
    expect(fails).toEqual([{ reason: 'network', status: null, count: 1 }]);

    const qlt = (await get(`/api/stats/quality?${qs()}`).expect(200)).body;
    expect(qlt).toMatchObject({ submittersOnce: 1, submittersMulti: 1, onceRate: 0.5, multiRate: 0.5, avgVisitsPerSubmitter: 1.5, duplicatePhones: 1, suspectedBots: 1, suspectedBotRate: 0.2 });

    const ins = (await get(`/api/stats/insights?${qs()}`).expect(200)).body;
    expect(ins).toEqual([]); // 표본 20명 미만
  });

  it('visitors: 작성 시작했지만 미신청 = v2, 신청 완료 = v1 v3, 여정 포함', async () => {
    const r = (await get(`/api/stats/visitors?${qs({ stage: 'FORM_START', submitted: 'false' })}`).expect(200)).body;
    expect(r.total).toBe(1);
    expect(r.items[0]).toMatchObject({ visitorId: 'v2', lastChannel: 'INSTAGRAM', lastStage: 'FORM_START', views: 1 });
    expect(r.items[0].journey.map((e: { type: string }) => e.type)).toEqual(['VIEW', 'FORM_VIEW', 'FORM_START']);
    expect(r.items[0].journey[2].meta).toEqual({ field: 'phone' });

    const done = (await get(`/api/stats/visitors?${qs({ stage: 'FORM_START', submitted: 'true' })}`).expect(200)).body;
    expect(done.items.map((i: { visitorId: string }) => i.visitorId).sort()).toEqual(['v1', 'v3']);
    const v1 = done.items.find((i: { visitorId: string }) => i.visitorId === 'v1');
    expect(v1.views).toBe(2);
  });

  it('journey: 같은 밀리초 이벤트는 단계 순으로 정렬 (비콘이 제출 응답 뒤에 도착하는 경우)', async () => {
    const t = at('2026-09-15', 18);
    // 역순 삽입: SUCCESS → ATTEMPT → START
    await ev(formA, igLink, 'v9', 'SUBMIT_SUCCESS', t);
    await ev(formA, igLink, 'v9', 'SUBMIT_ATTEMPT', t);
    await ev(formA, igLink, 'v9', 'FORM_START', t);
    await ev(formA, igLink, 'v9', 'VIEW', at('2026-09-15', 17));
    const sub = await prisma.submission.create({ data: { formId: formA, linkId: igLink, visitorId: 'v9', payload: {}, createdAt: t } });
    const r = (await get(`/api/submissions/${sub.id}/journey`).expect(200)).body;
    expect(r.events.map((e: { type: string }) => e.type)).toEqual(['VIEW', 'FORM_START', 'SUBMIT_ATTEMPT', 'SUBMIT_SUCCESS']);
    const vis = (await get(`/api/stats/visitors?${qs({ stage: 'FORM_START', submitted: 'true' })}`).expect(200)).body;
    const v9 = vis.items.find((i: { visitorId: string }) => i.visitorId === 'v9');
    expect(v9.journey.map((e: { type: string }) => e.type)).toEqual(['VIEW', 'FORM_START', 'SUBMIT_ATTEMPT', 'SUBMIT_SUCCESS']);
  });

  it('submissions/:id/journey: 신청 → 방문자 이벤트 타임라인, 소요 시간', async () => {
    const sub = await prisma.submission.findFirstOrThrow({ where: { visitorId: 'v1' } });
    const r = (await get(`/api/submissions/${sub.id}/journey`).expect(200)).body;
    expect(r.events.map((e: { type: string }) => e.type)).toEqual(['VIEW', 'FORM_VIEW', 'VIEW', 'FORM_VIEW', 'FORM_START', 'SUBMIT_ATTEMPT', 'SUBMIT_SUCCESS']);
    expect(r.visits).toBe(2);
    expect(r.secondsToSubmit).toBe(3600);
    expect(r.submission.link.channel).toBe('INSTAGRAM');
    await get(`/api/submissions/00000000-0000-0000-0000-000000000000/journey`).expect(404);
  });

  it('submissions: channel 필터는 서버에서, 잘못된 값은 400', async () => {
    const ig = (await get(`/api/submissions?channel=INSTAGRAM`).expect(200)).body;
    expect(ig.items.every((s: { link: { channel: string } }) => s.link.channel === 'INSTAGRAM')).toBe(true);
    expect(ig.total).toBeGreaterThanOrEqual(1);
    const yt = (await get(`/api/submissions?channel=YOUTUBE`).expect(200)).body;
    expect(yt.total).toBe(1);
    await get(`/api/submissions?channel=TIKTOK`).expect(400);
    await get(`/api/submissions?pageSize=1000`).expect(400);
    await get(`/api/submissions?page=abc`).expect(400);
    await get(`/api/stats/visitors?page=abc`).expect(400);
    await get(`/api/stats/visitors?pageSize=0`).expect(400);
  });

  it('실패: 잘못된 range / from>to / 남의 캠페인 / 잘못된 채널', async () => {
    await get(`/api/stats/funnel?range=1y`).expect(400);
    await get(`/api/stats/funnel?range=custom&from=2026-09-10&to=2026-09-01`).expect(400);
    await get(`/api/stats/funnel?channel=TIKTOK`).expect(400);
    await get(`/api/stats/funnel?campaignId=00000000-0000-0000-0000-000000000000`).expect(404);
    await request(app.getHttpServer()).get('/api/stats/funnel').expect(401);
  });

  it('range 기본값 7d, all 은 기간 밖(9/1) 포함', async () => {
    const all = (await get(`/api/stats/funnel?range=all`).expect(200)).body;
    expect(all.current.stages[0].visitors).toBe(7); // v0, v9 포함
    expect(all.period).toEqual({ from: null, to: null });
    const def = (await get(`/api/stats/funnel`).expect(200)).body;
    expect(def.range).toBe('7d');
  });
});
