import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db.js';
import { publicKey, sendToUser } from '../lib/push.js';

const Sub = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});

export async function pushRoutes(app: FastifyInstance) {
  app.get('/push/key', async () => ({ publicKey: publicKey() }));

  app.post('/push/subscribe', { preHandler: app.requireUser }, async (req, reply) => {
    const body = Sub.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Некорректная подписка' });
    const { endpoint, keys } = body.data;
    await pool.query(
      `insert into push_subs (user_id, endpoint, p256dh, auth) values ($1, $2, $3, $4)
       on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
      [req.user.uid, endpoint, keys.p256dh, keys.auth],
    );
    return { ok: true };
  });

  app.delete('/push/subscribe', { preHandler: app.requireUser }, async (req) => {
    const endpoint = (req.body as { endpoint?: string } | undefined)?.endpoint;
    if (endpoint) await pool.query('delete from push_subs where user_id = $1 and endpoint = $2', [req.user.uid, endpoint]);
    else await pool.query('delete from push_subs where user_id = $1', [req.user.uid]);
    return { ok: true };
  });

  app.post('/push/test', { preHandler: app.requireUser }, async (req) => {
    const sent = await sendToUser(req.user.uid, {
      title: 'Утка-дежурная на связи',
      body: 'Если ты это читаешь, уведомления работают. Теперь тебе от меня не спрятаться.',
      tag: 'test',
    });
    return { sent };
  });
}
