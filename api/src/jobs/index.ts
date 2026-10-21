import cron from 'node-cron';
import type { FastifyBaseLogger } from 'fastify';
import { kvGet, kvSet, pool } from '../db.js';
import { reminderText, weekResultText } from '../lib/duck.js';
import { TIERS, addDays, weekOutcome, weekStart } from '../lib/league.js';
import { sendToUser } from '../lib/push.js';
import { localParts, pickReminder } from '../lib/time.js';

/** Каждые 15 минут: кому из подписанных пора напомнить о серии. */
export async function runReminders(now = new Date()): Promise<number> {
  const users = await pool.query<{ id: string; tz: string; remind_hour: number; streak: number | null; last_day: string | null }>(
    `select u.id, u.tz, u.remind_hour, p.streak, p.last_day
       from users u left join progress p on p.user_id = u.id
      where exists (select 1 from push_subs s where s.user_id = u.id)`,
  );
  let sent = 0;
  for (const u of users.rows) {
    const local = localParts(now, u.tz);
    const pick = pickReminder(local, u.remind_hour, u.last_day, u.streak ?? 0);
    if (!pick) continue;
    const logged = await pool.query(
      'insert into notifications_log (user_id, kind, day) values ($1, $2, $3) on conflict do nothing',
      [u.id, pick.kind, local.date],
    );
    if (!logged.rowCount) continue; // уже писали сегодня
    const text = reminderText(pick.kind, pick.streak);
    sent += await sendToUser(Number(u.id), { ...text, url: '/', tag: 'reminder' });
  }
  return sent;
}

/** Закрывает неделю: повышения, вылеты и уведомления. Идемпотентно. */
export async function closeWeek(week: string, log?: FastifyBaseLogger): Promise<void> {
  const key = `closed:${week}`;
  if (await kvGet(key)) return;
  const lock = await pool.query<{ ok: boolean }>('select pg_try_advisory_lock(hashtext($1)) as ok', [key]);
  if (!lock.rows[0].ok) return; // другая реплика уже закрывает
  try {
    if (await kvGet(key)) return;
    const groups = await pool.query<{ tier: number; grp: number }>(
      'select distinct tier, grp from league_weeks where week = $1',
      [week],
    );
    for (const g of groups.rows) {
      const rows = await pool.query<{ user_id: string; xp: number }>(
        'select user_id, xp from league_weeks where week = $1 and tier = $2 and grp = $3',
        [week, g.tier, g.grp],
      );
      const standings = rows.rows.map((r) => ({ userId: Number(r.user_id), xp: r.xp }));
      const outcome = weekOutcome(standings, g.tier);
      const ranked = [...standings].sort((a, b) => b.xp - a.xp || a.userId - b.userId);
      for (const [i, s] of ranked.entries()) {
        const d = outcome.get(s.userId) ?? 0;
        const tier = Math.min(TIERS.length - 1, Math.max(0, g.tier + d));
        await pool.query(
          `insert into user_tier (user_id, tier) values ($1, $2)
           on conflict (user_id) do update set tier = excluded.tier`,
          [s.userId, tier],
        );
        await sendToUser(s.userId, { ...weekResultText(i + 1, d, TIERS[tier]), url: '/', tag: 'league' });
      }
    }
    await kvSet(key, { at: new Date().toISOString(), groups: groups.rowCount });
    log?.info({ week, groups: groups.rowCount }, 'league week closed');
  } finally {
    await pool.query('select pg_advisory_unlock(hashtext($1))', [key]);
  }
}

export function startJobs(log: FastifyBaseLogger): void {
  cron.schedule('*/15 * * * *', () => {
    runReminders().then((n) => n && log.info({ sent: n }, 'reminders sent')).catch((e) => log.error(e, 'reminders failed'));
  });
  const closePrev = () =>
    closeWeek(addDays(weekStart(), -7), log).catch((e) => log.error(e, 'closeWeek failed'));
  cron.schedule('10 0 * * 1', closePrev, { timezone: 'UTC' });
  closePrev(); // догоняем, если сервис лежал в понедельник ночью
}
