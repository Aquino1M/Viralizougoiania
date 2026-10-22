-- Execute no SQL Editor para aplicar as regras seguras ao banco existente.
alter table public.posts enable row level security;
drop policy if exists "Permitir leitura publica de posts" on public.posts;
create policy "Permitir leitura publica de posts" on public.posts for select using (status = 'published');
drop policy if exists "Permitir insercao de posts" on public.posts;
drop policy if exists "Permitir atualizacao de posts" on public.posts;
drop policy if exists "Permitir exclusao de posts" on public.posts;
revoke insert, update, delete on public.posts from anon, authenticated;

alter table public.categories enable row level security;
drop policy if exists "Permitir leitura publica de categorias" on public.categories;
create policy "Permitir leitura publica de categorias" on public.categories for select using (active = true);
drop policy if exists "Permitir insercao de categorias" on public.categories;
drop policy if exists "Permitir atualizacao de categorias" on public.categories;
drop policy if exists "Permitir exclusao de categorias" on public.categories;
revoke insert, update, delete on public.categories from anon, authenticated;

alter table public.settings enable row level security;
drop policy if exists "Permitir leitura publica de settings" on public.settings;
drop policy if exists "Permitir escrita de settings" on public.settings;
revoke all on public.settings from anon, authenticated;

alter table public.admins enable row level security;
alter table public.admins alter column password drop default;
drop policy if exists "Permitir leitura de admins" on public.admins;
drop policy if exists "Permitir escrita de admins" on public.admins;
revoke all on public.admins from anon, authenticated;

create table if not exists public.football_data (
  id text primary key default 'brasileirao',
  standings jsonb not null default '[]'::jsonb,
  fixtures jsonb not null default '[]'::jsonb,
  current_round integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.football_data enable row level security;
drop policy if exists "Permitir leitura publica de futebol" on public.football_data;
create policy "Permitir leitura publica de futebol" on public.football_data for select using (true);
drop policy if exists "Permitir gravacao de futebol" on public.football_data;
revoke insert, update, delete on public.football_data from anon, authenticated;

create extension if not exists pg_cron;
select cron.unschedule(jobid)
from cron.job
where jobname in ('publicar-fila-viralizougoiania', 'arquivar-noticias-antigas-viralizougoiania');

select cron.schedule(
  'publicar-fila-viralizougoiania',
  '* * * * *',
  $$
    update public.posts
    set status = 'published', updated_at = now()
    where status = 'scheduled' and published_at <= now();
  $$
);

select cron.schedule(
  'arquivar-noticias-antigas-viralizougoiania',
  '* * * * *',
  $$
    update public.posts
    set status = 'archived', updated_at = now()
    where status = 'published'
      and coalesce(published_at, created_at) < now() - interval '3 days';
  $$
);
