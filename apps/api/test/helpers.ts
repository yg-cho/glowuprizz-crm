import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { PrismaClient } from '@glowuprizz/db';
import { AppModule } from '../src/app.module';

export const prisma = new PrismaClient();

export async function resetDb() {
  // FK 순서 무관하게 전체 비움
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE submissions, visits, distribution_links, forms, campaigns, html_templates, operators RESTART IDENTITY CASCADE',
  );
}

export async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.init();
  return app;
}

export async function seedOperator(email = 'op@test.com', password = 'Password123!') {
  return prisma.operator.create({ data: { email, passwordHash: await bcrypt.hash(password, 4) } });
}

/** 로그인 후 Cookie 헤더 문자열 반환 */
export async function login(app: INestApplication, email = 'op@test.com', password = 'Password123!') {
  const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(200);
  const cookies = res.headers['set-cookie'] as unknown as string[];
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

export const SAMPLE_HTML = `<!doctype html><html><body>
<form><input name="name" /><input name="phone" /><button type="submit">go</button></form>
<script>console.log('operator js')</script></body></html>`;
