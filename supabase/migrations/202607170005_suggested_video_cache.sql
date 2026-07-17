create table if not exists public.youtube_suggestion_cache (
  normalized_query text primary key,
  results jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.youtube_suggestion_cache enable row level security;
revoke all on public.youtube_suggestion_cache from anon, authenticated;

