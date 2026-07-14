-- Market/region system: every place belongs to one market (gta, london, dubai, ...).
-- The app loads only the user's current market + a map-viewport query, instead of
-- downloading the whole world catalogue at startup.

alter table public.places add column if not exists market text;
alter table public.profiles add column if not exists home_market text;

-- GTA is a multi-city market (Toronto + Mississauga + Vaughan + ...): assign by bounding box.
update public.places set market = 'gta'
 where country = 'Canada' and lat between 43.35 and 44.05 and lng between -79.90 and -78.75
   and (market is null or market <> 'gta');

-- Everything else: market = slugified city (london, dubai, ottawa, tokyo, riyadh, ...).
update public.places
   set market = trim(both '-' from regexp_replace(lower(coalesce(nullif(city, ''), 'other')), '[^a-z0-9]+', '-', 'g'))
 where market is null;

create index if not exists places_market_active_idx on public.places(market) where is_active;
create index if not exists places_latlng_active_idx on public.places(lat, lng) where is_active;

-- Market registry the app reads: picker list, geo-resolution (nearest center within radius).
create table if not exists public.markets (
  slug text primary key,
  name text not null,
  country text,
  center_lat double precision,
  center_lng double precision,
  radius_km double precision not null default 40,
  place_count integer not null default 0,
  is_active boolean not null default true
);
alter table public.markets enable row level security;
drop policy if exists markets_read_all on public.markets;
create policy markets_read_all on public.markets for select using (true);

-- (Re)build registry rows from live data: centroid + a radius wide enough to cover
-- the market's span (~111 km per degree, half-span, 25% margin, clamped 15-90 km).
insert into public.markets (slug, name, country, center_lat, center_lng, radius_km, place_count)
select market,
       initcap(replace(market, '-', ' ')),
       min(country),
       avg(lat), avg(lng),
       greatest(15, least(90, 111.0 * greatest(max(lat) - min(lat), max(lng) - min(lng)) / 2.0 * 1.25)),
       count(*)
  from public.places
 where is_active = true and market is not null and lat is not null and lng is not null
 group by market
on conflict (slug) do update
   set center_lat = excluded.center_lat,
       center_lng = excluded.center_lng,
       radius_km = excluded.radius_km,
       place_count = excluded.place_count,
       country = excluded.country;

-- Friendly names for the multi-word markets.
update public.markets set name = 'Greater Toronto Area' where slug = 'gta';

-- Only markets with a real catalogue show in the picker.
update public.markets set is_active = (place_count >= 15);
