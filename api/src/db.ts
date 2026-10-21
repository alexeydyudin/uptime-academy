import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { config } from './config.js';

// DATE как строка 'YYYY-MM-DD', без сдвигов часовых поясов
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });

export async function migrate(dir = path.resolve('migrations')): Promise<void> {
  await pool.query(
    'create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())',
  );
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const done = await pool.query('select 1 from schema_migrations where name = $1', [file]);
    if (done.rowCount) continue;
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  }
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const r = await pool.query<{ value: T }>('select value from kv where key = $1', [key]);
  return r.rows[0]?.value ?? null;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await pool.query(
    'insert into kv (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value',
    [key, JSON.stringify(value)],
  );
}
