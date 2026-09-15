import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
const testUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://glow:glow@localhost:5433/glowuprizz_test';
process.env.DATABASE_URL = testUrl;
process.env.IP_HASH_SALT = 'test-salt';
process.env.NODE_ENV = 'test';

const dbDir = path.resolve(__dirname, '../../../packages/db');
execSync('npx prisma migrate deploy', { cwd: dbDir, env: { ...process.env, DATABASE_URL: testUrl }, stdio: 'ignore' });
