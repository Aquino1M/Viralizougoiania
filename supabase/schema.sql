-- ============================================================
-- VIRALIZOUGOIANIA - BANCO DE DADOS SUPABASE
-- Execute este script completo no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/mxjyktdozmtekushaknm/sql/new
-- ============================================================

create extension if not exists pgcrypto;

-- 1. Tabela de Notícias (posts)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  source_content text not null default '',
  category text not null default 'Goiânia',
  city text not null default 'Goiânia',
  author text not null default 'Redação Viralizougoiania',
  image_url text not null default '',
  image_credit text not null default '',
  featured boolean not null default false,
  status text not null default 'published',
  published_at timestamptz,
  source_name text not null default '',
  source_url text not null default '',
  source_author text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  seo_keywords text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migrações seguras de colunas caso a tabela já exista
alter table public.posts add column if not exists source_content text not null default '';
alter table public.posts add column if not exists image_credit text not null default '';
alter table public.posts add column if not exists source_author text not null default '';
alter table public.posts add column if not exists seo_title text not null default '';
alter table public.posts add column if not exists seo_description text not null default '';
alter table public.posts add column if not exists seo_keywords text not null default '';
alter table public.posts add column if not exists video_url text not null default '';
alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_status_check check (status in ('published','draft','scheduled'));

create index if not exists posts_status_published_at_idx on public.posts(status, published_at desc);
create index if not exists posts_category_idx on public.posts(category);

-- Permissões de RLS para leitura e escrita de posts
alter table public.posts enable row level security;
drop policy if exists "Permitir leitura publica de posts" on public.posts;
create policy "Permitir leitura publica de posts" on public.posts for select using (true);
drop policy if exists "Permitir insercao de posts" on public.posts;
create policy "Permitir insercao de posts" on public.posts for insert with check (true);
drop policy if exists "Permitir atualizacao de posts" on public.posts;
create policy "Permitir atualizacao de posts" on public.posts for update using (true);
drop policy if exists "Permitir exclusao de posts" on public.posts;
create policy "Permitir exclusao de posts" on public.posts for delete using (true);

-- 2. Tabela de Abas / Editorias (categories)
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
drop policy if exists "Permitir leitura publica de categorias" on public.categories;
create policy "Permitir leitura publica de categorias" on public.categories for select using (true);
drop policy if exists "Permitir insercao de categorias" on public.categories;
create policy "Permitir insercao de categorias" on public.categories for insert with check (true);
drop policy if exists "Permitir atualizacao de categorias" on public.categories;
create policy "Permitir atualizacao de categorias" on public.categories for update using (true);
drop policy if exists "Permitir exclusao de categorias" on public.categories;
create policy "Permitir exclusao de categorias" on public.categories for delete using (true);

-- 3. Tabela de Configurações e Redes Sociais (settings)
create table if not exists public.settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;
drop policy if exists "Permitir leitura publica de settings" on public.settings;
create policy "Permitir leitura publica de settings" on public.settings for select using (true);
drop policy if exists "Permitir escrita de settings" on public.settings;
create policy "Permitir escrita de settings" on public.settings for all using (true);

-- 4. Tabela de Administradores / Logins dos Funcionários (admins)
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null default 'Equipe Viralizougoiania',
  password text not null default 'admin123',
  role text not null default 'admin',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admins enable row level security;
drop policy if exists "Permitir leitura de admins" on public.admins;
create policy "Permitir leitura de admins" on public.admins for select using (true);
drop policy if exists "Permitir escrita de admins" on public.admins;
create policy "Permitir escrita de admins" on public.admins for all using (true);

-- Inserir Logins padrão no Supabase
insert into public.admins (email, name, password, role, active) values
  ('admin@viralizougoiania.com.br', 'Administrador Geral', 'admin123', 'admin', true),
  ('redacao@viralizougoiania.com.br', 'Redação Viralizougoiania', 'admin123', 'editor', true),
  ('aquino@viralizougoiania.com.br', 'Aquino', 'admin123', 'admin', true)
on conflict (email) do update set password = excluded.password, name = excluded.name, active = excluded.active;

-- 5. Inserção de Categorias Padrão
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

-- 6. Inserção das Configurações de Redes Sociais
insert into public.settings (id, data, updated_at) values (
  'default',
  '{
    "site_name": "Viralizougoiania",
    "tagline": "O que acontece em Goiânia, do seu bairro para a cidade inteira.",
    "socials": {
      "instagram": "https://instagram.com/viralizougoiania",
      "whatsapp": "https://chat.whatsapp.com/exemplo-viralizougoiania",
      "tiktok": "https://tiktok.com/@viralizougoiania",
      "youtube": "",
      "facebook": "",
      "twitter": ""
    }
  }'::jsonb,
  now()
) on conflict (id) do update set data = excluded.data, updated_at = now();

-- 7. Inserção das Notícias Iniciais do Portal (8 matérias)
insert into public.posts (slug, title, excerpt, content, category, city, author, image_url, featured, status, published_at) values
  ('goiania-em-foco-acompanhe-as-principais-noticias-da-capital', 
   'Goiânia em foco: acompanhe as principais notícias da capital ao longo do dia', 
   'Trânsito, bairros, serviços, eventos e tudo o que movimenta a rotina dos goianienses em um só lugar.', 
   'Esta é uma matéria demonstrativa criada para apresentar o layout do Viralizougoiania. Use o painel administrativo para substituir este conteúdo pelas notícias reais da sua redação.

O portal foi organizado para destacar informação local, com espaço para bairros, trânsito, segurança, serviços, empregos, eventos e outras pautas de interesse de quem vive em Goiânia.

No painel, você pode editar esta notícia, trocar a imagem, mudar a editoria, agendar a publicação e marcar outra matéria como destaque principal.', 
   'Goiânia', 'Goiânia', 'Redação Viralizougoiania', 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1600&q=85', true, 'published', now()),

  ('guia-de-transito-saiba-como-organizar-a-rota-pela-cidade', 
   'Guia de trânsito: saiba como organizar a rota pela cidade nos horários de maior movimento', 
   'Espaço do portal será usado para alertas de mobilidade, interdições, desvios e orientações para motoristas.', 
   'Conteúdo demonstrativo do Viralizougoiania. Esta editoria foi preparada para receber notícias de trânsito e mobilidade urbana.

Antes de publicar informações sobre interdições ou acidentes, confirme horários e locais em fontes oficiais ou diretamente com a equipe responsável.', 
   'Trânsito', 'Goiânia', 'Redação Viralizougoiania', 'https://images.unsplash.com/photo-1494522358652-f30e61a60313?auto=format&fit=crop&w=1600&q=85', false, 'published', now()),

  ('bairros-de-goiania-ganham-espaco-especial-no-novo-portal', 
   'Bairros de Goiânia ganham espaço especial no novo portal de notícias', 
   'A proposta é aproximar o noticiário da rotina de cada região da capital, com informação útil e participação local.', 
   'Esta notícia é um exemplo de como ficará a editoria de bairros. O Viralizougoiania pode organizar matérias por região e destacar assuntos próximos do leitor.

Você pode publicar pautas sobre obras, serviços públicos, comércio, eventos comunitários e outros temas locais usando o painel administrativo.', 
   'Bairros', 'Setor Bueno', 'Redação Viralizougoiania', 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?auto=format&fit=crop&w=1600&q=85', false, 'published', now()),

  ('agenda-de-goiania-espaco-reune-shows-feiras-e-eventos', 
   'Agenda de Goiânia: espaço reúne shows, feiras e eventos para curtir a cidade', 
   'A editoria de eventos foi desenhada para reunir programação cultural e opções de lazer em Goiânia.', 
   'Conteúdo de demonstração. No Viralizougoiania, a equipe pode publicar guias de eventos, shows, feiras, exposições e atividades para diferentes públicos.

Inclua sempre data, horário, endereço, regras de entrada e a fonte oficial das informações quando disponíveis.', 
   'Eventos', 'Goiânia', 'Redação Viralizougoiania', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=85', false, 'published', now()),

  ('empregos-em-goiania-portal-tera-espaco-para-vagas-e-oportunidades', 
   'Empregos em Goiânia: portal terá espaço para vagas e oportunidades', 
   'Nova editoria permite organizar seleções, mutirões de emprego, cursos e oportunidades divulgadas por fontes verificadas.', 
   'Esta é uma matéria demonstrativa da editoria de empregos. Ao publicar vagas reais, confirme empresa, quantidade de oportunidades, requisitos, prazo e canal oficial de candidatura.

O painel permite atualizar rapidamente uma publicação quando uma seleção for encerrada ou sofrer mudanças.', 
   'Empregos', 'Goiânia', 'Redação Viralizougoiania', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1600&q=85', false, 'published', now()),

  ('servicos-uteis-de-goiania-terao-area-dedicada-no-portal', 
   'Serviços úteis de Goiânia terão área dedicada no portal', 
   'Informações de utilidade pública poderão ser encontradas com mais facilidade e organizadas por assunto.', 
   'Matéria de demonstração para apresentar a seção de serviços. Ela pode ser usada para avisos de atendimento, prazos, mudanças de funcionamento e outras informações de utilidade pública.

Para esse tipo de notícia, dê preferência a fontes oficiais e mantenha a data de atualização claramente informada.', 
   'Serviços', 'Goiânia', 'Redação Viralizougoiania', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=85', false, 'published', now()),

  ('esportes-locais-ganham-cobertura-no-viralizougoiania', 
   'Esportes locais ganham cobertura no Viralizougoiania', 
   'Jogos, bastidores e agenda esportiva terão espaço próprio no portal com foco no público da capital.', 
   'Conteúdo demonstrativo da editoria de esportes. O espaço pode receber cobertura de partidas, agenda, resultados confirmados e informações dos clubes e organizações esportivas.

Use o painel para atualizar manchetes e destacar uma matéria em momentos de maior interesse.', 
   'Esportes', 'Goiânia', 'Esportes Viralizougoiania', 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1600&q=85', false, 'published', now()),

  ('seguranca-editoria-reune-alertas-e-informacoes-verificadas', 
   'Segurança: editoria reúne alertas e informações verificadas sobre Goiânia', 
   'O espaço foi preparado para notícias de segurança pública com destaque para localização, contexto e atualização das informações.', 
   'Este texto é apenas uma demonstração do layout da editoria de segurança. Em matérias reais, confirme os fatos em fontes oficiais, preserve informações sensíveis quando necessário e diferencie claramente dados confirmados de informações preliminares.

A fonte original pode ser registrada no próprio editor do painel administrativo.', 
   'Segurança', 'Goiânia', 'Redação Viralizougoiania', 'https://images.unsplash.com/photo-1453873531674-2151bcd01707?auto=format&fit=crop&w=1600&q=85', false, 'published', now())
on conflict (slug) do nothing;

-- =========================================================
-- AUTOMAÇÃO 24 HORAS NO SUPABASE (pg_cron)
-- Libera automaticamente matérias agendadas na fila a cada
-- 1 minuto, rodando 24 horas por dia no próprio servidor!
-- =========================================================

-- 1. Ativa a extensão pg_cron nativa do Supabase
create extension if not exists pg_cron;

-- 2. Agenda a liberação automática a cada 1 minuto (precisão máxima 24h por dia)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'publicar-fila-viralizougoiania') then
    perform cron.unschedule('publicar-fila-viralizougoiania');
  end if;
end $$;

select cron.schedule(
  'publicar-fila-viralizougoiania',
  '* * * * *',
  $cron$
    update public.posts
    set status = 'published', updated_at = now()
    where status = 'scheduled'
      and published_at is not null
      and published_at <= now();
  $cron$
);
