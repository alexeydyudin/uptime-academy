import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { config } from '../config.js';
import { isAdmin } from '../lib/admin.js';
import { pool } from '../db.js';
import { GROUP_SIZE, TIERS, addDays, weekStart, zones } from '../lib/league.js';

const Xp = z.object({ amount: z.number().int().min(1).max(100) });

/** Записывает пользователя в группу лиги на текущую неделю, если он ещё не там. */
async function joinWeek(db: PoolClient, uid: number, week: string): Promise<void> {
  const has = await db.query('select 1 from league_weeks where week = $1 and user_id = $2', [week, uid]);
  if (has.rowCount) return;
  const t = await db.query<{ tier: number }>('select tier from user_tier where user_id = $1', [uid]);
  const tier = t.rows[0]?.tier ?? 0;
  // Сериализуем распределение по группам внутри одной лиги
  await db.query('select pg_advisory_xact_lock(hashtext($1))', [`${week}:${tier}`]);
  const free = await db.query<{ grp: number }>(
    `select grp from league_weeks where week = $1 and tier = $2
      group by grp having count(*) < $3 order by grp limit 1`,
    [week, tier, GROUP_SIZE],
  );
  let grp = free.rows[0]?.grp;
  if (grp === undefined) {
    const max = await db.query<{ m: number | null }>(
      'select max(grp) as m from league_weeks where week = $1 and tier = $2',
      [week, tier],
    );
    grp = (max.rows[0]?.m ?? -1) + 1;
  }
  await db.query(
    'insert into league_weeks (week, user_id, tier, grp, xp) values ($1, $2, $3, $4, 0) on conflict do nothing',
    [week, uid, tier, grp],
  );
}

async function leagueView(uid: number) {
  const week = weekStart();
  if (await isAdmin(uid)) {
    // админы проходят всё без ограничений и не должны мешать честному рейтингу
    await pool.query('delete from league_weeks where week = $1 and user_id = $2', [week, uid]);
    return { week, tier: 0, tierName: TIERS[0], endsAt: addDays(week, 7) + 'T00:00:00Z', joined: false, excluded: true, rows: [], zones: zones(0, 0) };
  }
  const me = await pool.query<{ tier: number; grp: number }>(
    'select tier, grp from league_weeks where week = $1 and user_id = $2',
    [week, uid],
  );
  const endsAt = addDays(week, 7) + 'T00:00:00Z';
  if (!me.rows[0]) {
    const t = await pool.query<{ tier: number }>('select tier from user_tier where user_id = $1', [uid]);
    const tier = t.rows[0]?.tier ?? 0;
    return { week, tier, tierName: TIERS[tier], endsAt, joined: false, rows: [], zones: zones(0, tier) };
  }
  const { tier, grp } = me.rows[0];
  const rows = await pool.query<{ user_id: string; name: string; xp: number }>(
    `select lw.user_id, u.name, lw.xp from league_weeks lw join users u on u.id = lw.user_id
      where lw.week = $1 and lw.tier = $2 and lw.grp = $3 order by lw.xp desc, lw.user_id`,
    [week, tier, grp],
  );
  return {
    week,
    tier,
    tierName: TIERS[tier],
    endsAt,
    joined: true,
    zones: zones(rows.rows.length, tier),
    rows: rows.rows.map((r) => ({ name: r.name, xp: r.xp, me: Number(r.user_id) === uid })),
  };
}

export async function leagueRoutes(app: FastifyInstance) {
  app.get('/league', { preHandler: app.requireUser }, async (req) => leagueView(req.user.uid));

  /** Клиент сообщает о заработанном опыте. Лига считается только по этим событиям. */
  app.post('/xp', { preHandler: app.requireUser }, async (req, reply) => {
    const body = Xp.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'amount: целое от 1 до 100' });
    const uid = req.user.uid;
    const today = await pool.query<{ s: number }>(
      "select coalesce(sum(amount), 0)::int as s from xp_events where user_id = $1 and at > now() - interval '1 day'",
      [uid],
    );
    if (today.rows[0].s + body.data.amount > config.dailyXpCap)
      return reply.code(429).send({ error: 'Дневной лимит опыта. Утка подозревает накрутку.' });

    const week = weekStart();
    if (await isAdmin(uid)) {
      await pool.query('insert into xp_events (user_id, amount) values ($1, $2)', [uid, body.data.amount]);
      return leagueView(uid);
    }
    const db = await pool.connect();
    try {
      await db.query('begin');
      await db.query('insert into xp_events (user_id, amount) values ($1, $2)', [uid, body.data.amount]);
      await joinWeek(db, uid, week);
      await db.query('update league_weeks set xp = xp + $3 where week = $1 and user_id = $2', [week, uid, body.data.amount]);
      await db.query('commit');
    } catch (err) {
      await db.query('rollback');
      throw err;
    } finally {
      db.release();
    }
    return leagueView(uid);
  });
}
