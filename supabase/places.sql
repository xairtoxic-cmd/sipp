create table if not exists places (
  id text primary key,
  google_place_id text unique,
  name text not null,
  area text,
  city text,
  emirate text,
  country text default 'UAE',
  lat double precision,
  lng double precision,
  category text default 'cafe',
  tags text[] default '{}',
  price_level int,
  google_rating numeric,
  rating_count int,
  sipp_score numeric,
  phone text,
  website text,
  google_maps_url text,
  hours text,
  image_url text,
  blurb text,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table places enable row level security;
drop policy if exists "places read" on places;
create policy "places read" on places for select using (is_active);
alter table profiles add column if not exists city text;
create index if not exists places_city_idx on places(city);
create index if not exists places_category_idx on places(category);
