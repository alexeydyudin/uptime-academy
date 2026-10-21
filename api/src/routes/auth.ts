import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { clearSession, setSession } from '../auth.js';
import { pool } from '../db.js';

const Register = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8, 'Пароль от 8 символов').max(200),
  name: z.string().trim().min(2, 'Имя от 2 символов').max(32),
});
const Login = z.object({ email: z.string().trim().toLowerCase(), password: z.string() });
const Settings = z.object({
  name: z.string().trim().min(2).max(32).optional(),
  tz: z.string().max(64).optional(),
  remindHour: z.number().int().min(0).max(23).optional(),
});

const validTz = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (req, reply) => {
    const body = Register.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message });
    const hash = await bcrypt.hash(body.data.password, 10);
    try {
      const r = await pool.query<{ id: number }>(
        'insert into users (email, name, pass_hash) values ($1, $2, $3) returning id',
        [body.data.email, body.data.name, hash],
      );
      const id = Number(r.rows[0].id);
      await pool.query('insert into user_tier (user_id) values ($1)', [id]);
      setSession(app, reply, id);
      return { id, name: body.data.name };
    } catch (err) {
      if ((err as { code?: string }).code === '23505') return reply.code(409).send({ error: 'Такая почта уже зарегистрирована' });
      throw err;
    }
  });

  app.post('/auth/login', async (req, reply) => {
    const body = Login.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Укажи почту и пароль' });
    const r = await pool.query<{ id: number; name: string; pass_hash: string }>(
      'select id, name, pass_hash from users where email = $1',
      [body.data.email],
    );
    const u = r.rows[0];
    if (!u || !(await bcrypt.compare(body.data.password, u.pass_hash)))
      return reply.code(401).send({ error: 'Неверная почта или пароль' });
    setSession(app, reply, Number(u.id));
    return { id: Number(u.id), name: u.name };
  });

  app.post('/auth/logout', async (_req, reply) => {
    clearSession(reply);
    return { ok: true };
  });

  app.get('/me', { preHandler: app.requireUser }, async (req) => {
    const r = await pool.query(
      `select u.id, u.email, u.name, u.tz, u.remind_hour as "remindHour", coalesce(t.tier, 0) as tier,
              exists (select 1 from push_subs s where s.user_id = u.id) as "pushEnabled"
         from users u left join user_tier t on t.user_id = u.id where u.id = $1`,
      [req.user.uid],
    );
    return r.rows[0] ?? null;
  });

  app.patch('/me', { preHandler: app.requireUser }, async (req, reply) => {
    const body = Settings.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Некорректные настройки' });
    const { name, tz, remindHour } = body.data;
    if (tz && !validTz(tz)) return reply.code(400).send({ error: 'Неизвестный часовой пояс' });
    await pool.query(
      `update users set name = coalesce($2, name), tz = coalesce($3, tz), remind_hour = coalesce($4, remind_hour) where id = $1`,
      [req.user.uid, name ?? null, tz ?? null, remindHour ?? null],
    );
    return { ok: true };
  });
}
