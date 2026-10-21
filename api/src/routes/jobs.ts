import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { closeWeek, runReminders } from '../jobs/index.js';
import { addDays, weekStart } from '../lib/league.js';

/**
 * Для хостингов, где сервис засыпает: внешний планировщик раз в 10–15 минут
 * будит его и запускает фоновые задачи. Ключ — в заголовке x-cron-secret или ?key=.
 */
export async function jobRoutes(app: FastifyInstance) {
  app.route({
    method: ['GET', 'POST'],
    url: '/jobs/tick',
    handler: async (req, reply) => {
      const key = (req.headers['x-cron-secret'] as string | undefined) ?? (req.query as { key?: string }).key;
      if (!config.cronSecret || key !== config.cronSecret) return reply.code(401).send({ error: 'bad key' });
      const sent = await runReminders();
      await closeWeek(addDays(weekStart(), -7), app.log);
      return { ok: true, sent };
    },
  });
}
