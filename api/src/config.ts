const DEV_SECRET = 'dev-secret-change-me';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://uptime:uptime@localhost:5432/uptime',
  jwtSecret: process.env.JWT_SECRET ?? DEV_SECRET,
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
  // Дневной лимит XP на пользователя: защита лиги от накрутки
  dailyXpCap: Number(process.env.DAILY_XP_CAP ?? 800),
  jobsEnabled: process.env.JOBS_ENABLED !== 'false',
  // Папка собранного фронта: API отдаёт его сам (один сервис на бесплатном хостинге)
  staticDir: process.env.STATIC_DIR ?? '',
  // Секрет для внешнего планировщика (cron-job.org), который дёргает /api/jobs/tick
  cronSecret: process.env.CRON_SECRET ?? '',
};

if (process.env.NODE_ENV === 'production' && config.jwtSecret === DEV_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}
