-- resolve_market v2: rank candidate markets by RELATIVE distance (distance / radius),
-- not absolute distance — border points pick the market they're most central to
-- (Oakville → GTA even though Hamilton's center is closer).
create or replace function public.resolve_market(p_lat double precision, p_lng double precision)
returns table (market_id text, market_name text, country text)
language sql stable as $$
  select m.slug, m.name, m.country
    from public.markets m
   where m.is_active and m.center_lat is not null and m.center_lng is not null
     and sqrt(pow((m.center_lat - p_lat) * 111.0, 2) +
              pow((m.center_lng - p_lng) * 111.0 * cos(radians(p_lat)), 2)) <= greatest(m.radius_km, 25)
   order by sqrt(pow((m.center_lat - p_lat) * 111.0, 2) +
                 pow((m.center_lng - p_lng) * 111.0 * cos(radians(p_lat)), 2)) / greatest(m.radius_km, 25)
   limit 1
$$;
