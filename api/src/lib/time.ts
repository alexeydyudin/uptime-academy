import { addDays } from './league.js';
import type { ReminderKind } from './duck.js';

/** Дата и час в часовом поясе пользователя. */
export function localParts(now: Date, tz: string): { date: string; hour: number } {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);

/**
 * Решает, что (и надо ли) написать пользователю в этот час.
 * - занимался сегодня: молчим;
 * - час напоминания: обычное напоминание;
 * - 23:00 и серия ещё жива: «последний шанс»;
 * - пропал на 3, 7 или 14 дней: «утка скучает» вместо обычного.
 */
export function pickReminder(
  local: { date: string; hour: number },
  remindHour: number,
  lastDay: string | null,
  streak: number,
): { kind: ReminderKind; streak: number } | null {
  if (lastDay && lastDay >= local.date) return null;
  const alive = lastDay === addDays(local.date, -1);
  const gap = lastDay ? daysBetween(lastDay, local.date) : 0;

  if (local.hour === remindHour) {
    if (lastDay && [3, 7, 14].includes(gap)) return { kind: 'comeback', streak: 0 };
    if (lastDay && gap > 1) return null; // не спамим тех, кто ушёл: только в дни 3/7/14
    return { kind: 'evening', streak: alive ? streak : 0 };
  }
  if (local.hour === 23 && alive && streak > 0 && remindHour !== 23) return { kind: 'lastcall', streak };
  return null;
}
