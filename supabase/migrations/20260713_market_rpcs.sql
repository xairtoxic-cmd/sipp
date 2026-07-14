-- Region-aware Discover/Map backend: stable market ids (gta_ca, london_uk, dubai_uae),
-- resolve_market, search_places (paginated, ranked), map_places (pins/clusters),
-- places_by_ids. No pub logic anywhere.

create extension if not exists pg_trgm;

-- 1) Stable market ids: suffix with country code (idempotent — skips already-suffixed).
update public.places
   set market = replace(market, '-', '_') || '_' ||
       case country
         when 'Canada' then 'ca' when 'United Kingdom' then 'uk' when 'UAE' then 'uae'
         when 'Japan' then 'jp' when 'Saudi Arabia' then 'sa' when 'Qatar' then 'qa'
         when 'Jordan' then 'jo' else 'xx'
       end
 where market is not null and market !~ '_(ca|uk|uae|jp|sa|qa|jo|xx)$';

-- Rebuild the registry from live data under the new ids.
delete from public.markets;
insert into public.markets (slug, name, country, center_lat, center_lng, radius_km, place_count)
select market,
       initcap(replace(regexp_replace(market, '_(ca|uk|uae|jp|sa|qa|jo|xx)$', ''), '_', ' ')),
       min(country),
       avg(lat), avg(lng),
       greatest(15, least(90, 111.0 * greatest(max(lat) - min(lat), max(lng) - min(lng)) / 2.0 * 1.25)),
       count(*)
  from public.places
 where is_active = true and market is not null and lat is not null and lng is not null
 group by market;
update public.markets set name = 'Greater Toronto Area' where slug = 'gta_ca';
update public.markets set is_active = (place_count >= 15);

-- 2) Indexes that keep search/map fast as the catalogue grows.
create index if not exists places_name_trgm_idx on public.places using gin (name gin_trgm_ops) where is_active;
create index if not exists places_market_rank_idx on public.places (market, rating_count desc nulls last, id) where is_active;

-- 3) Consistent place-summary shape for every function below (same columns the app's
--    list views already use). distance_km appears only when a distance is supplied.
create or replace function public._place_summary(p public.places, p_distance double precision default null)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'area', p.area, 'city', p.city, 'country', p.country,
    'market', p.market, 'lat', p.lat, 'lng', p.lng,
    'google_rating', p.google_rating, 'rating_count', p.rating_count, 'price_level', p.price_level,
    'tags', to_jsonb(coalesce(p.tags, '{}'::text[])), 'category', p.category, 'image_url', p.image_url,
    'open_now', p.open_now, 'is_sipp_rated', p.is_sipp_rated, 'has_sipp_star', p.has_sipp_star,
    'sipp_rated_score', p.sipp_rated_score, 'created_at', p.created_at, 'primary_type', p.primary_type
  ) || case when p_distance is null then '{}'::jsonb
            else jsonb_build_object('distance_km', round(p_distance::numeric, 2)) end
$$;

-- 4) resolve_market(lat, lng) → the market whose radius covers the point (nearest wins).
create or replace function public.resolve_market(p_lat double precision, p_lng double precision)
returns table (market_id text, market_name text, country text)
language sql stable as $$
  select m.slug, m.name, m.country
    from public.markets m
   where m.is_active and m.center_lat is not null and m.center_lng is not null
     and sqrt(pow((m.center_lat - p_lat) * 111.0, 2) +
              pow((m.center_lng - p_lng) * 111.0 * cos(radians(p_lat)), 2)) <= greatest(m.radius_km, 25)
   order by sqrt(pow((m.center_lat - p_lat) * 111.0, 2) +
                 pow((m.center_lng - p_lng) * 111.0 * cos(radians(p_lat)), 2))
   limit 1
$$;

-- 5) search_places: market-scoped, ranked (name > area/city > tags/category/type),
--    distance as secondary rank, offset-cursor pagination (deterministic order → no dupes).
create or replace function public.search_places(
  p_market text,
  p_query text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_limit integer default 30,
  p_cursor text default null
) returns jsonb language plpgsql stable as $$
declare
  v_offset integer := coalesce(nullif(p_cursor, '')::integer, 0);
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 100);
  v_q text := nullif(regexp_replace(trim(coalesce(p_query, '')), '[%_]', '', 'g'), '');
  v_rows jsonb;
  v_more boolean;
begin
  with scored as (
    select p as rec,
      case
        when v_q is null then 0
        when lower(p.name) = lower(v_q) then 5
        when lower(p.name) like lower(v_q) || '%' then 4
        when p.name ilike '%' || v_q || '%' then 3
        when p.area ilike '%' || v_q || '%' or p.city ilike '%' || v_q || '%' then 2
        else 1
      end as score,
      case when p_lat is not null and p_lng is not null and p.lat is not null then
        sqrt(pow((p.lat - p_lat) * 111.0, 2) + pow((p.lng - p_lng) * 111.0 * cos(radians(p_lat)), 2))
      end as dist
    from public.places p
    where p.is_active and p.market = p_market
      and (v_q is null or (
        p.name ilike '%' || v_q || '%' or p.area ilike '%' || v_q || '%' or p.city ilike '%' || v_q || '%'
        or p.category ilike '%' || v_q || '%' or p.primary_type ilike '%' || v_q || '%'
        or exists (select 1 from unnest(coalesce(p.tags, '{}'::text[])) t where t ilike '%' || v_q || '%')
      ))
  ),
  ranked as (
    select rec, dist,
           row_number() over (order by score desc, dist asc nulls last,
                              (rec).rating_count desc nulls last, (rec).id asc) as rn
    from scored
  )
  select coalesce(jsonb_agg(public._place_summary(rec, dist) order by rn), '[]'::jsonb),
         count(*) > v_limit
    into v_rows, v_more
    from ranked
   where rn > v_offset and rn <= v_offset + v_limit + 1;

  -- the +1 probe row proves there is a next page; drop it from the payload
  if v_more then v_rows := v_rows - (jsonb_array_length(v_rows) - 1); end if;
  return jsonb_build_object(
    'places', v_rows,
    'next_cursor', case when v_more then (v_offset + v_limit)::text end
  );
end $$;

-- 6) map_places: only what the viewport shows. zoom >= 13 → pins; below → grid clusters
--    on an absolute grid (stable ids for the same zoom level).
create or replace function public.map_places(
  p_north double precision, p_south double precision,
  p_east double precision, p_west double precision,
  p_zoom integer default 15,
  p_market text default null,
  p_query text default null,
  p_tags text[] default null,
  p_category text default null,
  p_limit integer default 400
) returns jsonb language plpgsql stable as $$
declare
  v_q text := nullif(regexp_replace(trim(coalesce(p_query, '')), '[%_]', '', 'g'), '');
  v_cell double precision;
  v_out jsonb;
begin
  if coalesce(p_zoom, 15) >= 13 then
    select coalesce(jsonb_agg(public._place_summary(rec) order by (rec).rating_count desc nulls last), '[]'::jsonb)
      into v_out
      from (
        select p as rec from public.places p
        where p.is_active
          and p.lat between p_south and p_north and p.lng between p_west and p_east
          and (p_market is null or p.market = p_market)
          and (v_q is null or p.name ilike '%' || v_q || '%'
               or exists (select 1 from unnest(coalesce(p.tags, '{}'::text[])) t where t ilike '%' || v_q || '%'))
          and (p_tags is null or p.tags && p_tags)
          and (p_category is null or p.category = p_category)
        order by p.rating_count desc nulls last, p.id
        limit least(coalesce(p_limit, 400), 500)
      ) s;
    return jsonb_build_object('mode', 'pins', 'places', v_out, 'clusters', '[]'::jsonb);
  end if;

  v_cell := 90.0 / pow(2, coalesce(p_zoom, 10));
  select coalesce(jsonb_agg(c order by n desc), '[]'::jsonb) into v_out
    from (
      select count(*) as n, jsonb_build_object(
        'id', coalesce(p_zoom, 10) || ':' || gx || ':' || gy,
        'lat', avg_lat, 'lng', avg_lng, 'count', count,
        'bounds', jsonb_build_object(
          'south', gy * v_cell - 90, 'north', (gy + 1) * v_cell - 90,
          'west', gx * v_cell - 180, 'east', (gx + 1) * v_cell - 180)
      ) as c
      from (
        select floor((lng + 180) / v_cell)::int as gx, floor((lat + 90) / v_cell)::int as gy,
               avg(lat) as avg_lat, avg(lng) as avg_lng, count(*) as count, count(*) as n
        from public.places p
        where p.is_active
          and p.lat between p_south and p_north and p.lng between p_west and p_east
          and (p_market is null or p.market = p_market)
          and (v_q is null or p.name ilike '%' || v_q || '%'
               or exists (select 1 from unnest(coalesce(p.tags, '{}'::text[])) t where t ilike '%' || v_q || '%'))
          and (p_tags is null or p.tags && p_tags)
          and (p_category is null or p.category = p_category)
        group by 1, 2
      ) g
      group by gx, gy, avg_lat, avg_lng, count, n
      limit 200
    ) cl;
  return jsonb_build_object('mode', 'clusters', 'places', '[]'::jsonb, 'clusters', v_out);
end $$;

-- 7) Batched lookup for posts/reviews/boards/deep links.
create or replace function public.places_by_ids(p_ids text[])
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(public._place_summary(p)), '[]'::jsonb)
    from public.places p
   where p.is_active and p.id = any(coalesce(p_ids, '{}'::text[]));
$$;

grant execute on function public.resolve_market(double precision, double precision) to anon, authenticated;
grant execute on function public.search_places(text, text, double precision, double precision, integer, text) to anon, authenticated;
grant execute on function public.map_places(double precision, double precision, double precision, double precision, integer, text, text, text[], text, integer) to anon, authenticated;
grant execute on function public.places_by_ids(text[]) to anon, authenticated;

notify pgrst, 'reload schema';
