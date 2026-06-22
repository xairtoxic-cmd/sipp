-- Sipp Rated / Sipp Star layer on places.
alter table places add column if not exists community_score numeric;
alter table places add column if not exists sipp_rated_score numeric;
alter table places add column if not exists is_sipp_rated boolean default false;
alter table places add column if not exists has_sipp_star boolean default false;
alter table places add column if not exists sipp_review_date date;
alter table places add column if not exists sipp_reviewer_id text;
alter table places add column if not exists sipp_public_note text;
alter table places add column if not exists sipp_internal_note text;
alter table places add column if not exists sipp_rating_breakdown jsonb;
alter table places add column if not exists sipp_rating_photos text[];

-- Community score mirrors the existing Sipp score (from ratings/activity) for now.
update places set community_score = sipp_score where community_score is null;

-- Seed: mark the strongest spots as Sipp Rated (top per category).
with ranked as (
  select id, row_number() over (partition by category order by sipp_score desc, rating_count desc) as rn from places
)
update places p set
  is_sipp_rated = true,
  sipp_rated_score = least(9.8, round((p.sipp_score + 0.2)::numeric, 1)),
  sipp_review_date = date '2026-06-01',
  sipp_reviewer_id = 'Sipp Team',
  sipp_public_note = 'Visited in person by the Sipp team — a reliably excellent spot.'
from ranked r
where p.id = r.id and ((p.category = 'cafe' and r.rn <= 12) or (p.category = 'fine_dining' and r.rn <= 8));

-- Seed: award Sipp Star to the very best (fewer).
with ranked as (
  select id, row_number() over (partition by category order by sipp_score desc, rating_count desc) as rn from places
)
update places p set has_sipp_star = true
from ranked r
where p.id = r.id and ((p.category = 'cafe' and r.rn <= 4) or (p.category = 'fine_dining' and r.rn <= 3));
