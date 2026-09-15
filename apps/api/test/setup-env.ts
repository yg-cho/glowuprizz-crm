// e2e 공통 환경. 테스트 DB 로 강제하고 스키마 적용 + 초기화.
import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const testUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://glow:glow@localhost:5433/glowuprizz_test';
process.env.DATABASE_URL = testUrl;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
process.env.FORMS_PUBLIC_ORIGIN = 'http://127.0.0.1:3002';
process.env.NODE_ENV = 'test';

const dbDir = path.resolve(__dirname, '../../../packages/db');
execSync('npx prisma migrate deploy', { cwd: dbDir, env: { ...process.env, DATABASE_URL: testUrl }, stdio: 'ignore' });
