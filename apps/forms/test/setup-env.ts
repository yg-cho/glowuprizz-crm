// e2e 공통 환경. forms 전용 테스트 DB 로 강제하고 스키마 적용.
import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
// api e2e 와 다른 DB (동시 실행·순서와 무관하게 격리)
const testUrl = process.env.TEST_DATABASE_URL_FORMS ?? 'postgresql://glow:glow@localhost:5433/glowuprizz_test_forms';
process.env.DATABASE_URL = testUrl;
process.env.IP_HASH_SALT = 'test-salt-0123456789abcdef';
process.env.NODE_ENV = 'test';

const dbDir = path.resolve(__dirname, '../../../packages/db');
execSync('npx prisma migrate deploy', { cwd: dbDir, env: { ...process.env, DATABASE_URL: testUrl }, stdio: 'ignore' });
