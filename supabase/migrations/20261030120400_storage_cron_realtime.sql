-- Tracked: storage (avatars), jobs pg_cron e realtime

-- Bucket publico para leitura; escrita so em avatars/{uid}/* e so por contas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_guest()
  );

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_guest()
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime: notificacoes in-app (filtradas por recipient_id no cliente + RLS)
alter publication supabase_realtime add table public.notifications;

-- Jobs agendados ---------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

-- Rankings atualizados a cada hora.
select cron.schedule('refresh-rankings', '0 * * * *', 'select public.refresh_rankings()');

-- Remove visitantes inativos ha 30 dias que nunca comentaram.
select cron.schedule(
  'cleanup-anonymous-users',
  '0 4 * * *',
  $job$
    delete from auth.users u
    where u.is_anonymous
      and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '30 days'
      and not exists (select 1 from public.review_comments c where c.user_id = u.id)
  $job$
);
