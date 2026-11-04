-- =========================================================
-- CATÁLOGO DE PODS — configuração do banco no Supabase
-- Cole tudo no "SQL Editor" do Supabase e clique em "Run".
-- Pode rodar de novo sem problemas (é idempotente).
-- =========================================================

-- 1) Tabela de pods
create table if not exists public.pods (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  category    text not null default '',
  price       numeric(10, 2) not null default 0 check (price >= 0),
  images      text[] not null default '{}',
  available   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pods_set_updated_at on public.pods;
create trigger pods_set_updated_at
  before update on public.pods
  for each row execute function public.set_updated_at();

-- 2) Lista de e-mails que podem editar o catálogo
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security; -- ninguém lê/edita pela API

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- 3) Regras de acesso (RLS) dos pods
--    Qualquer pessoa vê os pods disponíveis; só admins criam/editam/excluem.
alter table public.pods enable row level security;

drop policy if exists "pods: leitura publica" on public.pods;
create policy "pods: leitura publica" on public.pods
  for select using (available or public.is_admin());

drop policy if exists "pods: admin cria" on public.pods;
create policy "pods: admin cria" on public.pods
  for insert to authenticated with check (public.is_admin());

drop policy if exists "pods: admin edita" on public.pods;
create policy "pods: admin edita" on public.pods
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pods: admin exclui" on public.pods;
create policy "pods: admin exclui" on public.pods
  for delete to authenticated using (public.is_admin());

-- 4) Bucket público para as fotos (até 5 MB por foto, somente imagens)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pod-images', 'pod-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pod-images: admin le" on storage.objects;
create policy "pod-images: admin le" on storage.objects
  for select to authenticated using (bucket_id = 'pod-images' and public.is_admin());

drop policy if exists "pod-images: admin envia" on storage.objects;
create policy "pod-images: admin envia" on storage.objects
  for insert to authenticated with check (bucket_id = 'pod-images' and public.is_admin());

drop policy if exists "pod-images: admin atualiza" on storage.objects;
create policy "pod-images: admin atualiza" on storage.objects
  for update to authenticated using (bucket_id = 'pod-images' and public.is_admin());

drop policy if exists "pod-images: admin apaga" on storage.objects;
create policy "pod-images: admin apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'pod-images' and public.is_admin());

-- 5) SEU E-MAIL DE ADMIN — troque pelo e-mail que você vai usar para entrar no painel
insert into public.admins (email) values ('seu-email@exemplo.com')
on conflict do nothing;
