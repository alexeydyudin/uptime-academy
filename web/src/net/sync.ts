import { HOOKS, S, save, toast } from '../game/state';
import { renderHome } from '../game/ui';
import { api, type League, type Me } from './api';

let me: Me | null = null;
let league: League | null = null;
let applying = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let leagueTimer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

export const session = {
  get me() {
    return me;
  },
  onChange(fn: () => void) {
    listeners.add(fn);
  },
};
const emit = () => listeners.forEach((f) => f());

const homeVisible = () => !document.getElementById('home')?.hidden;

/** Отправляет локальный прогресс, получает слитый с сервера и применяет его. */
async function pushProgress(): Promise<void> {
  try {
    const r = await api.put<{ state: typeof S }>('/api/progress', { state: S });
    applying = true;
    Object.assign(S, r.state);
    save();
  } catch {
    /* офлайн: повторим при следующем сохранении */
  } finally {
    applying = false;
  }
  if (homeVisible()) renderHome();
}

async function refreshLeague(): Promise<void> {
  try {
    league = await api.get<League>('/api/league');
    S.league.tier = league.tier;
    if (homeVisible()) renderHome();
  } catch {
    /* оставляем последнее известное состояние */
  }
}

function attachHooks(): void {
  HOOKS.save.length = 0;
  HOOKS.save.push(() => {
    if (applying) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushProgress, 1500);
  });
  HOOKS.xp.length = 0;
  HOOKS.xp.push((n: number) => {
    api
      .post<League>('/api/xp', { amount: Math.min(100, Math.max(1, Math.round(n))) })
      .then((l) => {
        league = l;
        S.league.tier = l.tier;
      })
      .catch((e) => e.status === 429 && toast(e.message));
  });
  HOOKS.leagueRows = () => {
    if (!league) return null;
    return league.joined ? league.rows : [{ name: me?.name ?? 'ты', xp: 0, me: true }];
  };
  HOOKS.leagueZones = () => (league?.joined ? league.zones : null);
  HOOKS.unlockAll = Boolean(me?.isAdmin);
}

function detachHooks(): void {
  HOOKS.save.length = 0;
  HOOKS.xp.length = 0;
  HOOKS.leagueRows = null;
  HOOKS.leagueZones = null;
  HOOKS.unlockAll = false;
  clearInterval(leagueTimer);
  league = null;
}

async function start(): Promise<void> {
  attachHooks();
  await pushProgress();
  await refreshLeague();
  clearInterval(leagueTimer);
  leagueTimer = setInterval(refreshLeague, 5 * 60_000);
  // Часовой пояс нужен серверу, чтобы утка писала вечером, а не в 3 ночи
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (me && tz && tz !== me.tz) api.patch('/api/me', { tz }).catch(() => {});
}

export async function initNet(): Promise<void> {
  try {
    me = await api.get<Me>('/api/me');
  } catch {
    me = null;
  }
  if (me) await start();
  emit();
}

export async function login(email: string, password: string): Promise<void> {
  await api.post('/api/auth/login', { email, password });
  me = await api.get<Me>('/api/me');
  await start();
  emit();
}

export async function register(name: string, email: string, password: string): Promise<void> {
  await api.post('/api/auth/register', { name, email, password });
  me = await api.get<Me>('/api/me');
  await start();
  emit();
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout');
  me = null;
  detachHooks();
  renderHome();
  emit();
}

export async function reloadMe(): Promise<void> {
  me = await api.get<Me>('/api/me');
  emit();
}
