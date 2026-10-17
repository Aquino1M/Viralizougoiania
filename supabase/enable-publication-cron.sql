-- Execute uma vez no SQL Editor do Supabase para ativar a liberação automática.
create extension if not exists pg_cron;

select cron.schedule(
  'publicar-fila-viralizougoiania',
  '* * * * *',
  $$
    update public.posts
    set status = 'published', updated_at = now()
    where status = 'scheduled' and published_at <= now();
  $$
);
