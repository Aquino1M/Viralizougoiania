-- Viralizougoiania - banco de notícias
-- Pode executar este arquivo tanto em projeto novo quanto em um banco criado com a versão anterior.
create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  category text not null default 'Goiânia',
  city text not null default 'Goiânia',
  author text not null default 'Redação Viralizougoiania',
  image_url text not null default '',
  featured boolean not null default false,
  status text not null default 'draft',
  published_at timestamptz,
  source_name text not null default '',
  source_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migração segura para quem já usava a primeira versão.
alter table public.posts add column if not exists source_name text not null default '';
alter table public.posts add column if not exists source_url text not null default '';
alter table public.posts alter column category set default 'Goiânia';
alter table public.posts alter column city set default 'Goiânia';
alter table public.posts alter column author set default 'Redação Viralizougoiania';
alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_status_check check (status in ('published','draft','scheduled'));

create index if not exists posts_status_published_at_idx on public.posts(status, published_at desc);
create index if not exists posts_category_idx on public.posts(category);

-- O backend usa a service role e não expõe a chave no navegador.
alter table public.posts enable row level security;

-- Abas/editorias editáveis pelo painel admin
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_active_order_idx on public.categories(active, sort_order asc);
alter table public.categories enable row level security;

insert into public.categories (name, slug, active, sort_order) values
  ('Goiânia', 'goiania', true, 1),
  ('Bairros', 'bairros', true, 2),
  ('Trânsito', 'transito', true, 3),
  ('Segurança', 'seguranca', true, 4),
  ('Política', 'politica', true, 5),
  ('Empregos', 'empregos', true, 6),
  ('Esportes', 'esportes', true, 7),
  ('Eventos', 'eventos', true, 8),
  ('Economia', 'economia', true, 9),
  ('Serviços', 'servicos', true, 10)
on conflict (slug) do nothing;


-- Equipe do painel administrativo
create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  name text not null,
  password_hash text not null,
  role text not null default 'journalist',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_users_role_check check (role in ('admin','journalist'))
);

create index if not exists staff_users_role_active_idx on public.staff_users(role, active);
alter table public.staff_users enable row level security;

-- Administrador inicial. A senha é armazenada apenas como hash scrypt.
insert into public.staff_users (id, username, name, password_hash, role, active)
values (
  '00000000-0000-0000-0000-000000000001',
  'aquino',
  'Aquino',
  'scrypt$3d1a4330816cf8d062da83e896da4d5e$bcda8494817c077622330604ae568a51967196cfac50658dbca61c5a392061560b87cfedd019031e3bb317ff8a3b158347baa561b0b0cb1ce47bbe70475463ba',
  'admin',
  true
)
on conflict (username) do nothing;
