with upsert_settings as (
  insert into public.site_settings (
    id,
    whatsapp_number,
    default_payment_text,
    default_delivery_text
  )
  values (
    true,
    '5585997586148',
    'A combinar pelo WhatsApp',
    'Taxa de entrega a combinar pelo WhatsApp'
  )
  on conflict (id) do update
  set
    whatsapp_number = excluded.whatsapp_number,
    default_payment_text = excluded.default_payment_text,
    default_delivery_text = excluded.default_delivery_text
  returning id
),
upsert_manuela as (
  insert into public.products (
    slug,
    sku,
    name,
    description,
    features,
    material,
    dimensions,
    price,
    catalog_status,
    badge_code,
    sort_order
  )
  values (
    'manuela',
    'VW-MAN-001',
    'Bolsa Manuela',
    'Tote em couro legitimo, acabamento artesanal e alca reforcada. Compartimento interno espacoso.',
    array[
      'Estrutura firme para uso diario.',
      'Visual classico e sofisticado.',
      'Boa capacidade interna.'
    ],
    'Couro legitimo',
    null,
    459.90,
    'ativo',
    null,
    1
  )
  on conflict (slug) do update
  set
    sku = excluded.sku,
    name = excluded.name,
    description = excluded.description,
    features = excluded.features,
    material = excluded.material,
    dimensions = excluded.dimensions,
    price = excluded.price,
    catalog_status = excluded.catalog_status,
    badge_code = excluded.badge_code,
    sort_order = excluded.sort_order
  returning id
),
upsert_olivia as (
  insert into public.products (
    slug,
    sku,
    name,
    description,
    features,
    material,
    dimensions,
    price,
    catalog_status,
    badge_code,
    sort_order
  )
  values (
    'olivia',
    'VW-OLI-001',
    'Bolsa Olivia',
    'Modelo compacto e elegante, ideal para quem busca uma peca delicada com presenca marcante.',
    array[
      'Formato compacto e refinado.',
      'Otima para producoes mais leves.',
      'Acabamento artesanal.'
    ],
    'Couro legitimo',
    null,
    329.90,
    'ativo',
    null,
    2
  )
  on conflict (slug) do update
  set
    sku = excluded.sku,
    name = excluded.name,
    description = excluded.description,
    features = excluded.features,
    material = excluded.material,
    dimensions = excluded.dimensions,
    price = excluded.price,
    catalog_status = excluded.catalog_status,
    badge_code = excluded.badge_code,
    sort_order = excluded.sort_order
  returning id
),
upsert_beatriz as (
  insert into public.products (
    slug,
    sku,
    name,
    description,
    features,
    material,
    dimensions,
    price,
    catalog_status,
    badge_code,
    sort_order
  )
  values (
    'beatriz',
    'VW-BEA-001',
    'Bolsa Beatriz',
    'Bolsa de linhas limpas e elegantes, pensada para acompanhar do casual ao mais alinhado.',
    array[
      'Silhueta minimalista.',
      'Combina com tons neutros e terrosos.',
      'Peca versatil para varias ocasioes.'
    ],
    'Couro legitimo',
    null,
    389.90,
    'ativo',
    null,
    3
  )
  on conflict (slug) do update
  set
    sku = excluded.sku,
    name = excluded.name,
    description = excluded.description,
    features = excluded.features,
    material = excluded.material,
    dimensions = excluded.dimensions,
    price = excluded.price,
    catalog_status = excluded.catalog_status,
    badge_code = excluded.badge_code,
    sort_order = excluded.sort_order
  returning id
)
select 1;

with products_cte as (
  select id, slug from public.products where slug in ('manuela', 'olivia', 'beatriz')
)
insert into public.product_colors (
  product_id,
  color_name,
  color_slug,
  stock_quantity,
  color_status,
  primary_image_path,
  primary_image_url,
  sort_order
)
select
  products_cte.id,
  color_name,
  color_slug,
  null,
  'disponivel',
  image_url,
  image_url,
  sort_order
from (
  values
    ('manuela', 'Caramelo', 'caramelo', 'assets/products/bolsa-manuela.jpg', 1),
    ('manuela', 'Preto', 'preto', 'assets/products/bolsa-manuela.jpg', 2),
    ('manuela', 'Whisky', 'whisky', 'assets/products/bolsa-manuela.jpg', 3),
    ('olivia', 'Bordo', 'bordo', 'assets/products/bolsa-olivia.jpg', 1),
    ('olivia', 'Cafe', 'cafe', 'assets/products/bolsa-olivia.jpg', 2),
    ('olivia', 'Caramelo', 'caramelo', 'assets/products/bolsa-olivia.jpg', 3),
    ('beatriz', 'Preto', 'preto', 'assets/products/bolsa-beatriz.png', 1),
    ('beatriz', 'Cafe', 'cafe', 'assets/products/bolsa-beatriz.png', 2),
    ('beatriz', 'Tabaco', 'tabaco', 'assets/products/bolsa-beatriz.png', 3)
) as source(product_slug, color_name, color_slug, image_url, sort_order)
join products_cte on products_cte.slug = source.product_slug
on conflict (product_id, color_slug) do update
set
  color_name = excluded.color_name,
  stock_quantity = excluded.stock_quantity,
  color_status = excluded.color_status,
  primary_image_path = excluded.primary_image_path,
  primary_image_url = excluded.primary_image_url,
  sort_order = excluded.sort_order;

with product_refs as (
  select id, slug from public.products where slug in ('manuela', 'olivia', 'beatriz')
)
insert into public.product_images (
  product_id,
  product_color_id,
  storage_path,
  public_url,
  alt_text,
  is_primary,
  sort_order
)
select
  product_refs.id,
  null,
  image_url,
  image_url,
  alt_text,
  true,
  0
from (
  values
    ('manuela', 'assets/products/bolsa-manuela.jpg', 'Bolsa Manuela'),
    ('olivia', 'assets/products/bolsa-olivia.jpg', 'Bolsa Olivia'),
    ('beatriz', 'assets/products/bolsa-beatriz.png', 'Bolsa Beatriz')
) as source(product_slug, image_url, alt_text)
join product_refs on product_refs.slug = source.product_slug
where not exists (
  select 1
  from public.product_images images
  where images.product_id = product_refs.id
    and images.product_color_id is null
    and images.is_primary = true
);
