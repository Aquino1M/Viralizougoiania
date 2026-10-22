-- Execute uma vez no SQL Editor do Supabase para ativar a liberação automática.
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
