/**
 * Сквозная проверка API на живом Postgres:
 *   DATABASE_URL=postgres://... NODE_ENV=test npx tsx scripts/smoke.ts
 */
import assert from 'node:assert/strict';
import { migrate, pool } from '../src/db.js';
import { buildApp } from '../src/index.js';
import { closeWeek, runReminders } from '../src/jobs/index.js';
import { weekStart } from '../src/lib/league.js';
import { initPush } from '../src/lib/push.js';

if (process.env.NODE_ENV !== 'test') throw new Error('smoke.ts запускается только с NODE_ENV=test: он чистит тестовые данные');
await migrate();
// убираем следы прошлых прогонов: тестовых пользователей и отметку о закрытой неделе
await pool.query("delete from users where email like '%@test.dev'");
await pool.query("delete from kv where key = $1", [`closed:${weekStart()}`]);
await initPush();
const app = await buildApp();

const sid = Date.now().toString(36);
async function signup(name: string) {
  const r = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: `${name}-${sid}@test.dev`, password: 'hunter2hunter2', name: `${name}_${sid}` } });
  assert.equal(r.statusCode, 200, r.body);
  const cookie = String(r.headers['set-cookie']).split(';')[0];
  return (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, payload?: unknown) =>
    app.inject({ method, url, payload: payload as object, headers: { cookie } });
}

const anon = await app.inject({ method: 'GET', url: '/api/me' });
assert.equal(anon.statusCode, 401);

const alex = await signup('alexey');
const yana = await signup('yaml_yana');

const dup = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: `alexey-${sid}@test.dev`, password: 'hunter2hunter2', name: 'x2' } });
assert.equal(dup.statusCode, 409);

// прогресс с двух устройств
await alex('PUT', '/api/progress', { state: { xp: 40, done: { l1: true }, lastDay: '2026-10-21', streak: 3, days: ['2026-10-21'] } });
const merged = (await alex('PUT', '/api/progress', { state: { xp: 25, done: { l2: true }, lastDay: '2026-10-22', streak: 4, days: ['2026-10-22'] } })).json();
assert.equal(merged.state.xp, 40);
assert.deepEqual(merged.state.done, { l1: true, l2: true });
assert.equal(merged.state.streak, 4);

// лига
let lg = (await alex('GET', '/api/league')).json();
assert.equal(lg.joined, false);
lg = (await alex('POST', '/api/xp', { amount: 30 })).json();
await yana('POST', '/api/xp', { amount: 55 });
lg = (await alex('GET', '/api/league')).json();
assert.equal(lg.joined, true);
assert.equal(lg.tierName, 'Бронза');
const mine = lg.rows.map((r: { name: string }) => r.name).filter((n: string) => n.endsWith(sid));
assert.deepEqual(mine, [`yaml_yana_${sid}`, `alexey_${sid}`]);
assert.equal((await alex('POST', '/api/xp', { amount: 500 })).statusCode, 400);

// настройки и push
assert.equal((await alex('PATCH', '/api/me', { tz: 'Mars/Olympus' })).statusCode, 400);
assert.equal((await alex('PATCH', '/api/me', { tz: 'Asia/Almaty', remindHour: 21 })).statusCode, 200);
const key = (await app.inject({ method: 'GET', url: '/api/push/key' })).json();
assert.ok(key.publicKey.length > 40);
assert.equal((await alex('POST', '/api/push/subscribe', { endpoint: 'https://push.invalid/sub/1', keys: { p256dh: 'BOGUS', auth: 'BOGUS' } })).statusCode, 200);
const me = (await alex('GET', '/api/me')).json();
assert.equal(me.pushEnabled, true);
assert.equal(me.remindHour, 21);

// джобы: не падают на реальных данных
await runReminders(new Date());
await closeWeek(weekStart());
const tiers = await pool.query('select split_part(u.name, \'_\' || $2, 1) as name, t.tier from user_tier t join users u on u.id = t.user_id where u.email like $1 order by u.name', [`%-${sid}@test.dev`, sid]);
console.log('tiers after close:', tiers.rows);
assert.equal(tiers.rows.find((r) => r.name === 'yaml_yana')?.tier, 1);

// --- безопасность ---
const evil = await app.inject({ method: 'POST', url: '/api/xp', payload: { amount: 5 }, headers: { origin: 'https://evil.example', host: 'localhost' } });
assert.equal(evil.statusCode, 403, 'чужой Origin должен получить 403');
const same = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { origin: 'http://localhost', host: 'localhost' } });
assert.equal(same.statusCode, 200, 'свой Origin пропускаем');
assert.equal((await alex('PUT', '/api/progress', { state: { xp: 'много' } })).statusCode, 400);
assert.equal((await alex('PUT', '/api/progress', { state: { done: { '<img onerror=x>': true } } })).statusCode, 400);
assert.equal((await alex('PUT', '/api/progress', { state: { xp: 50, futureField: { ok: true } } })).statusCode, 200, 'неизвестные поля пропускаем');
const badName = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: `x-${sid}@test.dev`, password: 'hunter2hunter2', name: '<script>' } });
assert.equal(badName.statusCode, 400);
const page = await app.inject({ method: 'GET', url: '/api/health' });
assert.equal(page.headers['x-content-type-options'], 'nosniff');
// лимит на вход: 10 попыток за 15 минут с одного IP
let last = 0;
for (let i = 0; i < 11; i++) last = (await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: `nobody-${sid}@test.dev`, password: 'wrong-password' } })).statusCode;
assert.equal(last, 429, 'одиннадцатая попытка входа должна упереться в лимит');

console.log('SMOKE OK');
await app.close();
await pool.end();
