import { describe, expect, it } from 'vitest';
import { addDays, weekOutcome, weekStart, zones } from './league.js';
import { mergeProgress } from './merge.js';
import { localParts, pickReminder } from './time.js';

describe('mergeProgress', () => {
  it('никогда не теряет пройденные уроки и опыт', () => {
    const m = mergeProgress(
      { xp: 120, done: { l1: true, l2: true }, days: ['2026-10-20'] },
      { xp: 80, done: { l3: true }, days: ['2026-10-21'] },
    );
    expect(m.xp).toBe(120);
    expect(m.done).toEqual({ l1: true, l2: true, l3: true });
    expect(m.days).toEqual(['2026-10-20', '2026-10-21']);
  });

  it('серию берёт с устройства, где активность свежее', () => {
    const m = mergeProgress({ lastDay: '2026-10-22', streak: 9 }, { lastDay: '2026-10-21', streak: 12 });
    expect(m.streak).toBe(9);
    expect(m.lastDay).toBe('2026-10-22');
  });

  it('дневную статистику за один день объединяет', () => {
    const m = mergeProgress(
      { daily: { date: '2026-10-22', xp: 30, cmds: 4, perfect: false, claimed: { goal: true } } },
      { daily: { date: '2026-10-22', xp: 15, cmds: 9, perfect: true, claimed: {} } },
    );
    expect(m.daily).toEqual({ date: '2026-10-22', xp: 30, cmds: 9, perfect: true, claimed: { goal: true } });
  });
});

describe('league', () => {
  it('неделя начинается в понедельник', () => {
    expect(weekStart(new Date('2026-10-22T12:00:00Z'))).toBe('2026-10-19');
    expect(weekStart(new Date('2026-10-19T00:00:00Z'))).toBe('2026-10-19');
    expect(weekStart(new Date('2026-10-25T23:59:00Z'))).toBe('2026-10-19');
    expect(addDays('2026-10-19', 7)).toBe('2026-10-26');
  });

  it('в Бронзе никто не вылетает, в Алмазе никто не поднимается', () => {
    expect(zones(30, 0)).toEqual({ up: 6, down: 0 });
    expect(zones(30, 5)).toEqual({ up: 0, down: 6 });
    expect(zones(30, 2)).toEqual({ up: 6, down: 6 });
  });

  it('подниматься можно только с ненулевым опытом', () => {
    const out = weekOutcome(
      [
        { userId: 1, xp: 50 },
        { userId: 2, xp: 0 },
        { userId: 3, xp: 0 },
      ],
      1,
    );
    expect(out.get(1)).toBe(1);
    expect(out.get(3)).toBe(-1);
  });
});

describe('reminders', () => {
  const day = '2026-10-22';
  it('молчит, если сегодня уже занимался', () => {
    expect(pickReminder({ date: day, hour: 20 }, 20, day, 5)).toBeNull();
  });
  it('в час напоминания пишет про живую серию', () => {
    expect(pickReminder({ date: day, hour: 20 }, 20, '2026-10-21', 5)).toEqual({ kind: 'evening', streak: 5 });
  });
  it('в 23:00 — последний шанс', () => {
    expect(pickReminder({ date: day, hour: 23 }, 20, '2026-10-21', 5)).toEqual({ kind: 'lastcall', streak: 5 });
  });
  it('пропавшим пишет только на 3, 7 и 14 день', () => {
    expect(pickReminder({ date: day, hour: 20 }, 20, '2026-10-19', 5)?.kind).toBe('comeback');
    expect(pickReminder({ date: day, hour: 20 }, 20, '2026-10-17', 5)).toBeNull();
  });
  it('считает местное время', () => {
    expect(localParts(new Date('2026-10-22T15:30:00Z'), 'Asia/Almaty')).toEqual({ date: '2026-10-22', hour: 20 });
  });
});
