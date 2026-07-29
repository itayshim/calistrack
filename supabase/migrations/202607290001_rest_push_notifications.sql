create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  device_token_hash text not null unique,
  subscription jsonb not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scheduled_rest_notifications (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  completion_id text not null,
  workout_id text,
  language text not null default 'en' check (language in ('en', 'he')),
  scheduled_for timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'sending', 'sent', 'cancelled', 'handled', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, completion_id)
);

create index if not exists scheduled_rest_notifications_due_idx
  on public.scheduled_rest_notifications (scheduled_for)
  where status = 'scheduled';

alter table public.push_subscriptions enable row level security;
alter table public.scheduled_rest_notifications enable row level security;

revoke all on public.push_subscriptions from anon, authenticated;
revoke all on public.scheduled_rest_notifications from anon, authenticated;

-- Edge Functions use the service-role key. No browser role receives direct table access.
