create table public.products (
  id integer primary key,
  title text not null,
  description text not null,
  category text not null,
  brand text,
  tags text[] not null default '{}',
  payload jsonb not null default '{}'
);

create table public.offers (
  product_id integer primary key references public.products (id) on delete cascade,
  price numeric(12, 2) not null,
  availability_status text not null,
  shipping_information text not null
);

create index products_category_idx on public.products (category);
create index products_tags_gin on public.products using gin (tags);
