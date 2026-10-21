import type { FastifyInstance } from 'fastify';
import { pool } from '../db.js';
import { mergeProgress, type Progress } from '../lib/merge.js';

const MAX_STATE_BYTES = 200_000;
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function progressRoutes(app: FastifyInstance) {
  app.get('/progress', { preHandler: app.requireUser }, async (req) => {
    const r = await pool.query<{ state: Progress; updated_at: Date }>(
      'select state, updated_at from progress where user_id = $1',
      [req.user.uid],
    );
    return r.rows[0] ? { state: r.rows[0].state, updatedAt: r.rows[0].updated_at } : { state: null };
  });

  /** Клиент шлёт свой стейт, сервер сливает его с сохранённым и возвращает итог. */
  app.put('/progress', { preHandler: app.requireUser }, async (req, reply) => {
    const body = req.body as { state?: Progress } | undefined;
    if (!body?.state || typeof body.state !== 'object') return reply.code(400).send({ error: 'Нет state' });
    if (JSON.stringify(body.state).length > MAX_STATE_BYTES) return reply.code(413).send({ error: 'Слишком большой state' });

    const client = await pool.connect();
    try {
      await client.query('begin');
      const cur = await client.query<{ state: Progress }>(
        'select state from progress where user_id = $1 for update',
        [req.user.uid],
      );
      const merged = mergeProgress(cur.rows[0]?.state ?? null, body.state);
      await client.query(
        `insert into progress (user_id, state, xp, streak, last_day, updated_at)
         values ($1, $2, $3, $4, $5, now())
         on conflict (user_id) do update set state = excluded.state, xp = excluded.xp,
           streak = excluded.streak, last_day = excluded.last_day, updated_at = now()`,
        [req.user.uid, JSON.stringify(merged), merged.xp ?? 0, merged.streak ?? 0, isDay(merged.lastDay) ? merged.lastDay : null],
      );
      await client.query('commit');
      return { state: merged };
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  });
}
