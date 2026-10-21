import path from 'node:path';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { jobRoutes } from './routes/jobs.js';
import { authPlugin } from './auth.js';
import { config } from './config.js';
import { migrate, pool } from './db.js';
import { startJobs } from './jobs/index.js';
import { initPush } from './lib/push.js';
import { authRoutes } from './routes/auth.js';
import { leagueRoutes } from './routes/league.js';
import { progressRoutes } from './routes/progress.js';
import { pushRoutes } from './routes/push.js';

export async function buildApp() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
    bodyLimit: 512 * 1024,
    trustProxy: true,
  });
  await app.register(authPlugin);
  await app.register(
    async (api) => {
      // Render дёргает health каждые 5 секунд: не засоряем лог
      api.get('/health', { logLevel: 'warn' }, async () => {
        await pool.query('select 1');
        return { ok: true };
      });
      await api.register(authRoutes);
      await api.register(progressRoutes);
      await api.register(leagueRoutes);
      await api.register(pushRoutes);
      await api.register(jobRoutes);
    },
    { prefix: '/api' },
  );

  if (config.staticDir) {
    await app.register(fastifyStatic, {
      root: path.resolve(config.staticDir),
      wildcard: false,
      setHeaders(res, file) {
        if (/(sw\.js|\.webmanifest|index\.html)$/.test(file)) res.header('Cache-Control', 'no-cache');
        else if (file.includes(`${path.sep}assets${path.sep}`)) res.header('Cache-Control', 'public, max-age=31536000, immutable');
      },
    });
    // SPA: всё, что не API и не файл, отдаёт index.html
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'Not found' });
      return reply.header('Cache-Control', 'no-cache').sendFile('index.html');
    });
  }
  return app;
}

async function main() {
  await migrate();
  await initPush();
  const app = await buildApp();
  if (config.jobsEnabled) startJobs(app.log);
  await app.listen({ port: config.port, host: '0.0.0.0' });

  const stop = async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

if (process.env.NODE_ENV !== 'test') {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
