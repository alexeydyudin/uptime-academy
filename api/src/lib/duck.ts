/** Тексты утки-дежурной для push-уведомлений. */
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

export type ReminderKind = 'evening' | 'lastcall' | 'comeback';

export function reminderText(kind: ReminderKind, streak: number): { title: string; body: string } {
  if (kind === 'lastcall') {
    return {
      title: `Серия ${streak} дн. гаснет`,
      body: pick([
        'Час до полуночи. Один урок, и серия жива. Я жду, пейджер тоже.',
        'Последний шанс. Даже прод в 23:00 получает больше внимания, чем я.',
        'Серия умрёт тихо, без алерта. Если только ты не зайдёшь сейчас.',
      ]),
    };
  }
  if (kind === 'comeback') {
    return {
      title: 'Утка скучает',
      body: pick([
        'Я пинговал тебя через liveness probe. Ответа нет. Ты там живой?',
        'Пока тебя не было, три пода ушли в CrashLoopBackOff. Совпадение? Не думаю.',
        'Прод держится. Пока что. Заходи, повторим kubectl.',
      ]),
    };
  }
  return streak > 0
    ? {
        title: `Серия: ${streak} дн.`,
        body: pick([
          'Пять минут на урок, и серия продлится. Прод сам себя не поднимет.',
          'Твоя серия хрупкая, как деплой в пятницу вечером. Зайди.',
          'Ежедневный health check: ты сегодня занимался? Пока нет.',
        ]),
      }
    : {
        title: 'Утка-дежурная',
        body: pick([
          'Сегодня отличный день, чтобы научиться не ронять прод.',
          'Один урок в день, и через месяц ты сам будешь будить джунов.',
        ]),
      };
}

export function weekResultText(rank: number, delta: -1 | 0 | 1, tierName: string): { title: string; body: string } {
  if (delta > 0) return { title: 'Повышение!', body: `${rank}-е место за неделю. Добро пожаловать в лигу «${tierName}».` };
  if (delta < 0) return { title: 'Вылет из лиги', body: `${rank}-е место. Теперь ты в лиге «${tierName}». Отыграемся?` };
  return { title: 'Неделя закрыта', body: `${rank}-е место. Остаёшься в лиге «${tierName}». Можно лучше.` };
}
