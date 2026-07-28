#!/usr/bin/env node
/**
 * Supabase에 class_bookings 스키마를 적용합니다.
 *
 * 사용 예:
 *   SUPABASE_SERVICE_KEY=... node scripts/apply-class-bookings-schema.mjs
 *   SUPABASE_ACCESS_TOKEN=... node scripts/apply-class-bookings-schema.mjs
 *   DATABASE_URL=postgres://... node scripts/apply-class-bookings-schema.mjs
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.WEOLBU_SUPABASE_URL ||
  'https://inftexpcnfinglwlrvsj.supabase.co'
).replace(/\/$/, '');
const SERVICE_KEY = (
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.WEOLBU_SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  ''
).trim();
const ACCESS_TOKEN = (process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const DB_URL = (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '').trim();
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ||
  (SUPABASE_URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i) || [])[1] ||
  'inftexpcnfinglwlrvsj';

const SQL = readFileSync(join(__dirname, '../supabase/class_bookings.sql'), 'utf8');

function log(msg) {
  console.log(msg);
}

async function applySqlViaManagementApi() {
  if (!ACCESS_TOKEN) {
    log('SKIP management SQL: SUPABASE_ACCESS_TOKEN 없음');
    return false;
  }
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: SQL }),
    },
  );
  const text = await response.text();
  if (!response.ok) {
    log(`FAIL management SQL (${response.status}): ${text.slice(0, 400)}`);
    return false;
  }
  log(`OK management SQL: ${text.slice(0, 200)}`);
  return true;
}

function applySqlViaPsql() {
  if (!DB_URL) {
    log('SKIP psql: DATABASE_URL/SUPABASE_DB_URL 없음');
    return false;
  }
  const result = spawnSync(
    'psql',
    [DB_URL, '-v', 'ON_ERROR_STOP=1', '-f', 'supabase/class_bookings.sql'],
    { encoding: 'utf8' },
  );
  if (result.status === 0) {
    log(`OK psql:\n${(result.stdout || '').slice(0, 400)}`);
    return true;
  }
  log(`FAIL psql (${result.status}): ${(result.stderr || result.stdout || '').slice(0, 400)}`);
  return false;
}

async function probeTable() {
  const key = SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!key) return false;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/class_bookings?select=id&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  const text = await response.text();
  if (response.ok) {
    log(`OK probe class_bookings (${response.status}): ${text.slice(0, 120)}`);
    return true;
  }
  log(`FAIL probe class_bookings (${response.status}): ${text.slice(0, 200)}`);
  return false;
}

async function main() {
  log(`Target: ${SUPABASE_URL} (${PROJECT_REF})`);
  const viaMgmt = await applySqlViaManagementApi();
  const viaPsql = viaMgmt ? false : applySqlViaPsql();
  if (!viaMgmt && !viaPsql) {
    log('');
    log('스키마를 자동 적용하지 못했습니다. Supabase SQL Editor에서');
    log('supabase/class_bookings.sql 내용을 실행해 주세요.');
  }
  const ok = await probeTable();
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
