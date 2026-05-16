create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.panel_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.badge_options (
  code text primary key,
  label text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint badge_options_code_check check (
    code in ('lancamento', 'mais_vendida', 'edicao_limitada', 'promocao')
  )
);

insert into public.badge_options (code, label, sort_order)
values
  ('lancamento', 'Lancamento', 1),
  ('mais_vendida', 'Mais vendida', 2),
  ('edicao_limitada', 'Edicao limitada', 3),
  ('promocao', 'Promocao', 4)
on conflict (code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order;

create table if not exists public.site_settings (
  id boolean primary key default true check (id = true),
  whatsapp_number text not null,
  default_payment_text text not null,
  default_delivery_text text not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sku text not null unique,
  name text not null,
  description text not null default '',
  features text[] not null default '{}',
  material text,
  dimensions text,
  price numeric(10,2) not null default 0 check (price >= 0),
  catalog_status text not null default 'ativo',
  badge_code text references public.badge_options(code) on delete set null,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_catalog_status_check check (
    catalog_status in ('ativo', 'inativo', 'arquivado')
  )
);

create table if not exists public.product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color_name text not null,
  color_slug text not null,
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  color_status text not null default 'disponivel',
  primary_image_path text,
  primary_image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_colors_unique_slug unique (product_id, color_slug),
  constraint product_colors_status_check check (
    color_status in ('disponivel', 'esgotado', 'sob_encomenda')
  )
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  product_color_id uuid references public.product_colors(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  alt_text text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists product_images_primary_product_idx
  on public.product_images (product_id)
  where product_color_id is null and is_primary = true;

create unique index if not exists product_images_primary_color_idx
  on public.product_images (product_color_id)
  where product_color_id is not null and is_primary = true;

create index if not exists products_catalog_status_sort_idx
  on public.products (catalog_status, sort_order, created_at desc);

create index if not exists product_colors_product_sort_idx
  on public.product_colors (product_id, sort_order, created_at desc);

create index if not exists product_images_product_sort_idx
  on public.product_images (product_id, sort_order, created_at desc);

drop trigger if exists set_updated_at_panel_users on public.panel_users;
create trigger set_updated_at_panel_users
before update on public.panel_users
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_badge_options on public.badge_options;
create trigger set_updated_at_badge_options
before update on public.badge_options
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_site_settings on public.site_settings;
create trigger set_updated_at_site_settings
before update on public.site_settings
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_products on public.products;
create trigger set_updated_at_products
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_product_colors on public.product_colors;
create trigger set_updated_at_product_colors
before update on public.product_colors
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_product_images on public.product_images;
create trigger set_updated_at_product_images
before update on public.product_images
for each row
execute function public.set_updated_at();

create or replace function public.is_panel_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.panel_users pu
    where pu.user_id = auth.uid()
      and pu.is_active = true
  );
$$;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
set public = excluded.public;

alter table public.panel_users enable row level security;
alter table public.badge_options enable row level security;
alter table public.site_settings enable row level security;
alter table public.products enable row level security;
alter table public.product_colors enable row level security;
alter table public.product_images enable row level security;

drop policy if exists panel_users_select on public.panel_users;
create policy panel_users_select
on public.panel_users
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists panel_users_update_own on public.panel_users;
create policy panel_users_update_own
on public.panel_users
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists badge_options_public_read on public.badge_options;
create policy badge_options_public_read
on public.badge_options
for select
to anon, authenticated
using (is_active = true);

drop policy if exists badge_options_panel_write on public.badge_options;
create policy badge_options_panel_write
on public.badge_options
for all
to authenticated
using (public.is_panel_user())
with check (public.is_panel_user());

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read
on public.site_settings
for select
to anon, authenticated
using (true);

drop policy if exists site_settings_panel_write on public.site_settings;
create policy site_settings_panel_write
on public.site_settings
for all
to authenticated
using (public.is_panel_user())
with check (public.is_panel_user());

drop policy if exists products_public_read on public.products;
create policy products_public_read
on public.products
for select
to anon, authenticated
using (catalog_status = 'ativo');

drop policy if exists products_panel_write on public.products;
create policy products_panel_write
on public.products
for all
to authenticated
using (public.is_panel_user())
with check (public.is_panel_user());

drop policy if exists product_colors_public_read on public.product_colors;
create policy product_colors_public_read
on public.product_colors
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_colors.product_id
      and p.catalog_status = 'ativo'
  )
);

drop policy if exists product_colors_panel_write on public.product_colors;
create policy product_colors_panel_write
on public.product_colors
for all
to authenticated
using (public.is_panel_user())
with check (public.is_panel_user());

drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read
on public.product_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and p.catalog_status = 'ativo'
  )
);

drop policy if exists product_images_panel_write on public.product_images;
create policy product_images_panel_write
on public.product_images
for all
to authenticated
using (public.is_panel_user())
with check (public.is_panel_user());

drop policy if exists storage_product_images_public_read on storage.objects;
create policy storage_product_images_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists storage_product_images_panel_insert on storage.objects;
create policy storage_product_images_panel_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and public.is_panel_user()
);

drop policy if exists storage_product_images_panel_update on storage.objects;
create policy storage_product_images_panel_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_panel_user()
)
with check (
  bucket_id = 'product-images'
  and public.is_panel_user()
);

drop policy if exists storage_product_images_panel_delete on storage.objects;
create policy storage_product_images_panel_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_panel_user()
);

insert into public.site_settings (
  id,
  whatsapp_number,
  default_payment_text,
  default_delivery_text
)
values (
  true,
  '5511999999999',
  'A combinar pelo WhatsApp',
  'Taxa de entrega a combinar pelo WhatsApp'
)
on conflict (id) do nothing;
