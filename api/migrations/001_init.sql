-- Пользователи и их настройки напоминаний
create table users (
  id           bigserial primary key,
  email        text not null unique,
  name         text not null,
  pass_hash    text not null,
  tz           text not null default 'Asia/Almaty',
  remind_hour  int  not null default 20 check (remind_hour between 0 and 23),
  created_at   timestamptz not null default now()
);

-- Прогресс: весь стейт клиента в jsonb + денормализованные поля для джобов
create table progress (
  user_id     bigint primary key references users on delete cascade,
  state       jsonb  not null,
  xp          int    not null default 0,
  streak      int    not null default 0,
  last_day    date,
  updated_at  timestamptz not null default now()
);

-- Журнал опыта: источник правды для лиги и защита от накруток
create table xp_events (
  id       bigserial primary key,
  user_id  bigint not null references users on delete cascade,
  amount   int    not null check (amount between 1 and 100),
  at       timestamptz not null default now()
);
create index xp_events_user_at on xp_events (user_id, at);

-- Текущая лига пользователя (0 = Бронза)
create table user_tier (
  user_id  bigint primary key references users on delete cascade,
  tier     int not null default 0
);

-- Участие в недельной группе лиги
create table league_weeks (
  week     date   not null,
  user_id  bigint not null references users on delete cascade,
  tier     int    not null,
  grp      int    not null,
  xp       int    not null default 0,
  primary key (week, user_id)
);
create index league_weeks_group on league_weeks (week, tier, grp, xp desc);

-- Подписки web push (у пользователя может быть несколько устройств)
create table push_subs (
  id         bigserial primary key,
  user_id    bigint not null references users on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- Чтобы утка не написала дважды за день одно и то же
create table notifications_log (
  user_id  bigint not null references users on delete cascade,
  kind     text   not null,
  day      date   not null,
  primary key (user_id, kind, day)
);

-- Служебное хранилище: VAPID-ключи, отметки о закрытых неделях
create table kv (
  key    text primary key,
  value  jsonb not null
);
