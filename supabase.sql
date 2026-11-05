-- =========================================================
-- CATÁLOGO DE PODS — estrutura do banco no Supabase
-- ---------------------------------------------------------
-- Já aplicado no projeto hgrkqkucdtcydpxnrwxg (armag-cobranca-2).
-- Todos os nomes têm prefixo "pods" para não interferir no
-- sistema de cobrança que usa o mesmo projeto.
-- Use este arquivo só para recriar a estrutura em outro projeto.
-- =========================================================

-- 1) Tabela de pods
create table public.pods (
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

create function public.pods_set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pods_set_updated_at
  before update on public.pods
  for each row execute function public.pods_set_updated_at();

-- 2) E-mails que podem editar o catálogo (sem acesso pela API)
create table public.pods_admins (
  email text primary key
);
alter table public.pods_admins enable row level security;
revoke all on public.pods_admins from anon, authenticated;

create function public.pods_is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pods_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.pods_is_admin() from public;
grant execute on function public.pods_is_admin() to anon, authenticated;

-- 3) Regras de acesso: todos veem os disponíveis; só admins do catálogo editam
alter table public.pods enable row level security;

create policy "pods: leitura publica" on public.pods
  for select using (available or public.pods_is_admin());

create policy "pods: admin cria" on public.pods
  for insert to authenticated with check (public.pods_is_admin());

create policy "pods: admin edita" on public.pods
  for update to authenticated using (public.pods_is_admin()) with check (public.pods_is_admin());

create policy "pods: admin exclui" on public.pods
  for delete to authenticated using (public.pods_is_admin());

-- 4) Bucket público de fotos (até 5 MB, só imagens)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pod-images', 'pod-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "pod-images: admin le" on storage.objects
  for select to authenticated using (bucket_id = 'pod-images' and public.pods_is_admin());

create policy "pod-images: admin envia" on storage.objects
  for insert to authenticated with check (bucket_id = 'pod-images' and public.pods_is_admin());

create policy "pod-images: admin atualiza" on storage.objects
  for update to authenticated using (bucket_id = 'pod-images' and public.pods_is_admin());

create policy "pod-images: admin apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'pod-images' and public.pods_is_admin());

-- 5) Admins do catálogo: troque pelo e-mail de quem vai entrar no painel
-- insert into public.pods_admins (email) values ('seu-email@exemplo.com');
