/**
 * Слияние прогресса с двух устройств. Правила подобраны так, чтобы игрок
 * никогда не терял пройденное: опыт и пройденные уроки только растут,
 * серия берётся с устройства, где последний активный день свежее.
 */
export interface Daily {
  date: string;
  xp: number;
  cmds: number;
  perfect: boolean;
  claimed: Record<string, boolean>;
}

export interface Progress {
  xp?: number;
  streak?: number;
  best?: number;
  lastDay?: string | null;
  days?: string[];
  done?: Record<string, boolean>;
  hearts?: number;
  heartsAt?: number;
  goal?: number;
  /** Когда цель выбрана явно (мс). 0 — выбрана в онбординге до входа, такая цель не перетирает серверную. */
  goalAt?: number;
  onboarded?: boolean;
  code?: string | null;
  review?: { l: string; i: number }[];
  daily?: Daily;
  league?: unknown;
  [key: string]: unknown;
}

export function mergeProgress(server: Progress | null, client: Progress): Progress {
  if (!server) return client;
  const out: Progress = { ...server, ...client };

  out.xp = Math.max(server.xp ?? 0, client.xp ?? 0);
  out.best = Math.max(server.best ?? 0, client.best ?? 0, server.streak ?? 0, client.streak ?? 0);
  out.done = { ...(server.done ?? {}), ...(client.done ?? {}) };
  out.days = [...new Set([...(server.days ?? []), ...(client.days ?? [])])].sort().slice(-60);
  out.onboarded = Boolean(server.onboarded || client.onboarded);
  out.code = client.code ?? server.code ?? null;

  const gs = server.goalAt ?? 0;
  const gc = client.goalAt ?? 0;
  if (gc > gs) {
    out.goal = client.goal;
    out.goalAt = gc;
  } else {
    out.goal = server.goal ?? client.goal;
    out.goalAt = gs;
  }

  const ls = server.lastDay ?? '';
  const lc = client.lastDay ?? '';
  if (ls > lc) {
    out.lastDay = server.lastDay;
    out.streak = server.streak ?? 0;
  } else if (lc > ls) {
    out.lastDay = client.lastDay;
    out.streak = client.streak ?? 0;
  } else {
    out.streak = Math.max(server.streak ?? 0, client.streak ?? 0);
  }

  const ds = server.daily;
  const dc = client.daily;
  if (ds && dc) {
    if (ds.date > dc.date) out.daily = ds;
    else if (dc.date > ds.date) out.daily = dc;
    else
      out.daily = {
        date: dc.date,
        xp: Math.max(ds.xp, dc.xp),
        cmds: Math.max(ds.cmds, dc.cmds),
        perfect: ds.perfect || dc.perfect,
        claimed: { ...ds.claimed, ...dc.claimed },
      };
  }
  return out;
}
