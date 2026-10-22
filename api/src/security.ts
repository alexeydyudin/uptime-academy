import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from './fp.js';

/** Лимиты на чувствительные маршруты. Ключ — IP или пользователь. */
export const LIMITS = {
  // Вход: на пару IP + почта, чтобы коллеги из одного офиса (один внешний IP) не мешали друг другу,
  // а перебор паролей к одному аккаунту упирался в лимит. Ключ строится после разбора тела запроса.
  login: {
    max: 10,
    timeWindow: '15 minutes',
    hook: 'preHandler' as const,
    keyGenerator: (req: FastifyRequest) => {
      const email = String((req.body as { email?: unknown } | undefined)?.email ?? '').trim().toLowerCase().slice(0, 200);
      return `login:${req.ip}:${email}`;
    },
  },
  register: { max: 20, timeWindow: '1 hour' },
  xp: { max: 30, timeWindow: '1 minute' },
  progress: { max: 60, timeWindow: '1 minute' },
  pushTest: { max: 5, timeWindow: '1 minute' },
  jobs: { max: 10, timeWindow: '1 minute' },
} as const;

/** Для авторизованных маршрутов лимит считаем на пользователя, иначе — на IP. */
export const byUser = (req: FastifyRequest) => {
  try {
    const t = req.cookies?.ua_session;
    if (t) return 'u:' + (req.server.jwt.decode<{ uid: number }>(t)?.uid ?? req.ip);
  } catch {
    /* битая кука — считаем по IP */
  }
  return 'ip:' + req.ip;
};

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export const securityPlugin = fp(async (app: FastifyInstance) => {
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: ctx.statusCode,
      error: `Слишком много запросов. Попробуй через ${Math.ceil(ctx.ttl / 1000)} с.`,
    }),
  });

  // CSRF: браузер всегда шлёт Origin у изменяющих запросов. Чужой Origin — отказ.
  // Запросы без Origin (curl, планировщик) пропускаем: у них нет cookie жертвы.
  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return;
    if (!req.url.startsWith('/api/')) return;
    const origin = req.headers.origin;
    if (!origin) return;
    let host: string;
    try {
      host = new URL(origin).host;
    } catch {
      return reply.code(403).send({ error: 'Запрос с недопустимого источника' });
    }
    const allowed = [req.headers.host, ...(process.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean).map((o) => new URL(o).host)];
    if (!allowed.includes(host)) return reply.code(403).send({ error: 'Запрос с недопустимого источника' });
  });

  app.addHook('onSend', async (req, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (/\/assets\/scriptWorker-[\w-]+\.js$/.test(req.url)) {
      // Воркер исполняет код игрока (уроки автоматизации): eval разрешён только здесь,
      // а сеть из воркера закрыта — код не сможет ходить в API от имени игрока.
      reply.header('Content-Security-Policy', "default-src 'none'; script-src 'self' 'unsafe-eval'; connect-src 'none'");
    } else if (!req.url.startsWith('/api/')) reply.header('Content-Security-Policy', CSP);
    return payload;
  });
});
