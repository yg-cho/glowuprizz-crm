import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, login, prisma, resetDb, seedOperator } from './helpers';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => { app = await createApp(); });
  beforeEach(async () => { await resetDb(); await seedOperator(); });
  afterAll(async () => { await app.close(); await prisma.$disconnect(); });

  it('성공: 올바른 자격 증명이면 httpOnly 쿠키 발급', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login').send({ email: 'op@test.com', password: 'Password123!' }).expect(200);
    expect(res.body.operator.email).toBe('op@test.com');
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    expect(cookie).toMatch(/^gu_admin=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('실패: 비밀번호 틀리면 401, 존재하지 않는 계정도 동일 메시지', async () => {
    const a = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'op@test.com', password: 'WrongPass123' }).expect(401);
    const b = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'WrongPass123' }).expect(401);
    expect(a.body.message).toBe(b.body.message);
  });

  it('실패: 형식 오류(이메일 아님, 8자 미만)는 400', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'not-email', password: 'short' }).expect(400);
  });

  it('미인증으로 관리자 API 접근 시 401', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    await request(app.getHttpServer()).get('/api/templates').expect(401);
    await request(app.getHttpServer()).get('/api/campaigns').expect(401);
    await request(app.getHttpServer()).get('/api/submissions').expect(401);
    await request(app.getHttpServer()).get('/api/stats/funnel').expect(401);
    await request(app.getHttpServer()).get('/api/config').expect(401);
  });

  it('위조 쿠키는 401', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', 'gu_admin=eyJhbGciOiJIUzI1NiJ9.fake.sig').expect(401);
  });

  it('config: 공개 폼 origin 반환', async () => {
    const cookie = await login(app);
    const r = await request(app.getHttpServer()).get('/api/config').set('Cookie', cookie).expect(200);
    expect(r.body).toEqual({ formsPublicOrigin: 'http://127.0.0.1:3002' });
  });

  it('운영자가 삭제되면 서명이 유효한 토큰도 401', async () => {
    const cookie = await login(app);
    await prisma.operator.deleteMany({ where: { email: 'op@test.com' } });
    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie).expect(401);
  });

  it('로그인 후 /me, 로그아웃 후 쿠키 제거', async () => {
    const cookie = await login(app);
    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie).expect(200);
    const out = await request(app.getHttpServer()).post('/api/auth/logout').set('Cookie', cookie).expect(204);
    expect((out.headers['set-cookie'] as unknown as string[])[0]).toMatch(/gu_admin=;/);
  });
});
