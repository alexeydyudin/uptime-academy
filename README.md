# Uptime Academy

DevOps-тренажёр в духе Duolingo: путь от терминала до Kubernetes, CI/CD, мониторинга и ночного дежурства. Пять минут в день, утка-дежурная следит за серией.

## Учебный план

10 ступеней по роадмапам DevOps 2026 (roadmap.sh, Tproger, «Код», практические роадмапы junior DevOps): Linux → Сети → Git → Docker → CI/CD → IaC → Kubernetes → Наблюдаемость → DevSecOps → Автоматизация и SRE. Облака, GitOps и FinOps — следующие ступени.

Каждый урок: короткая лекция (2–3 карточки) → задания-цели в терминале или редакторе конфигов с лестницей из трёх подсказок → разбор вывода. В конце каждой ступени — проект для портфолио, который делается вживую.

Уроки — в `web/src/content/lessons/<ступень>.ts`, карта — в `web/src/content/units.ts`, миры уроков — в `web/src/content/worlds.ts`. Симулятор команд — `web/src/engine/shell/` (по доменам: linux, git, docker, k8s, iac, observability, security). Типы — `web/src/engine/types.ts`: контент проверяется компилятором строго.

Каждый урок автоматически проходится эталонным решением и альтернативными командами в `web/src/content/lessons.test.ts` (`cd web && npm test`). Новый урок без прохождения в тестах не вливаем.

## Бесплатный деплой

Render + Neon + cron-job.org, пошагово: [DEPLOY.md](DEPLOY.md).

## Запуск локально в Docker

```bash
cp .env.example .env        # поменяй JWT_SECRET
docker compose up -d --build
open http://localhost:8080
```

Миграции применяются сами при старте API. VAPID-ключи для push тоже генерируются сами при первом запуске и сохраняются в БД.

## Разработка

```bash
# база
docker compose up -d db

# API: http://localhost:3000
cd api && npm install
DATABASE_URL=postgres://uptime:uptime@localhost:5432/uptime npm run dev

# фронт: http://localhost:5173, /api проксируется на :3000
cd web && npm install && npm run dev
```

Проверки:

```bash
cd api && npm test                      # слияние прогресса, лиги, расписание напоминаний
cd api && DATABASE_URL=... NODE_ENV=test npx tsx scripts/smoke.ts   # сквозной прогон на живом Postgres
cd web && npm run build                 # tsc + vite build
```

## Как устроено

```
web/                     Vite + TypeScript, без фреймворка
  src/engine/            движок: types (мир, урок, шаг), world, shell/ (симулятор команд по доменам)
  src/content/           контент: units (карта), lessons/ (уроки по ступеням), worlds (миры уроков)
  src/game/              интерфейс: state, progress, ui (карта, уроки), boss (ночная смена), duck, boot,
                         scriptWorker (код игрока в Web Worker)
  src/net/               сеть: api-клиент, sync (прогресс и лига), push, account (вход и настройки)
  public/sw.js           service worker: показывает push от утки
api/                     Fastify + PostgreSQL
  src/routes/            auth, progress, league + xp, push
  src/lib/               merge (слияние прогресса), league (недели, зоны), time (когда напоминать), duck (тексты)
  src/jobs/              напоминания каждые 15 мин, закрытие недели лиги в понедельник 00:10 UTC
  migrations/            SQL-миграции
```

Игра полностью работает без аккаунта, прогресс в localStorage. После входа:

- **Прогресс** синхронизируется: клиент шлёт свой стейт, сервер сливает его с сохранённым (`lib/merge.ts`). Опыт и пройденные уроки только растут, серия берётся с устройства, где активность свежее.
- **Лига** считается на сервере по событиям `POST /api/xp`, а не по стейту клиента. Группы по 30 человек, топ-20% поднимаются, нижние 20% вылетают (в Бронзе не вылетает никто). Дневной лимит XP защищает от накрутки.
- **Напоминания**: в выбранный час, «последний шанс» в 23:00 по местному времени, если серия под угрозой, и «утка скучает» на 3, 7 и 14 день отсутствия. Повторно в тот же день не пишет (`notifications_log`).

## Прод

- `COOKIE_SECURE=true` и HTTPS: без HTTPS браузеры не дают web push (кроме localhost).
- На iPhone push работает только у сайта, добавленного на экран «Домой» (iOS 16.4+).
- Если API запущен в нескольких репликах, джобы безопасны (блокировки и журнал), но лучше включить их на одной: `JOBS_ENABLED=false` на остальных.
- `/api/health` проверяет базу — годится для readiness probe.

## Что дальше

- Снять `@ts-nocheck` с `src/engine` и `src/game` (контент уже типизирован строго).
- Rate limit на `/api/auth/*` (например `@fastify/rate-limit`) и сброс пароля по почте.
- Повторение ошибок по кривой забывания на сервере, юнит Terraform.
