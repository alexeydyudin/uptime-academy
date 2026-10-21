import webpush from 'web-push';
import { config } from '../config.js';
import { kvGet, kvSet, pool } from '../db.js';

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

let keys: VapidKeys | null = null;

/** Берёт VAPID-ключи из env, иначе из БД, иначе генерирует и сохраняет. */
export async function initPush(): Promise<void> {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    keys = await kvGet<VapidKeys>('vapid');
    if (!keys) {
      keys = webpush.generateVAPIDKeys();
      await kvSet('vapid', keys);
    }
  }
  webpush.setVapidDetails(config.vapidSubject, keys.publicKey, keys.privateKey);
}

export function publicKey(): string {
  if (!keys) throw new Error('push not initialised');
  return keys.publicKey;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Шлёт на все устройства пользователя. Протухшие подписки удаляет. */
export async function sendToUser(userId: number, payload: PushPayload): Promise<number> {
  const subs = await pool.query<{ id: number; endpoint: string; p256dh: string; auth: string }>(
    'select id, endpoint, p256dh, auth from push_subs where user_id = $1',
    [userId],
  );
  let sent = 0;
  for (const s of subs.rows) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 3600 },
      );
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await pool.query('delete from push_subs where id = $1', [s.id]);
    }
  }
  return sent;
}
