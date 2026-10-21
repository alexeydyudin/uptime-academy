export const TIERS = ['Бронза', 'Серебро', 'Золото', 'Сапфир', 'Рубин', 'Алмаз'];
export const GROUP_SIZE = 30;

/** Понедельник недели (UTC) в формате YYYY-MM-DD. Недели лиг считаются по UTC. */
export function weekStart(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const x = new Date(day + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

export interface Standing {
  userId: number;
  xp: number;
}

export interface Zones {
  up: number;
  down: number;
}

/** Сколько мест поднимается и сколько вылетает в группе размера n. */
export function zones(n: number, tier: number): Zones {
  const share = Math.round(n * 0.2);
  const up = tier >= TIERS.length - 1 || n < 2 ? 0 : Math.max(1, share);
  const down = tier === 0 || n < 3 ? 0 : Math.min(Math.max(1, share), n - up);
  return { up, down };
}

/**
 * Итог недели для группы: +1 повышение, -1 вылет, 0 остаётся.
 * Подниматься можно только с ненулевым опытом, ничьи решает меньший userId
 * (кто раньше зарегистрировался).
 */
export function weekOutcome(rows: Standing[], tier: number): Map<number, -1 | 0 | 1> {
  const sorted = [...rows].sort((a, b) => b.xp - a.xp || a.userId - b.userId);
  const { up, down } = zones(sorted.length, tier);
  const res = new Map<number, -1 | 0 | 1>();
  sorted.forEach((r, i) => {
    if (i < up && r.xp > 0) res.set(r.userId, 1);
    else if (i >= sorted.length - down) res.set(r.userId, -1);
    else res.set(r.userId, 0);
  });
  return res;
}
