-- Taste-learning: event log + per-user taste profile.
create table if not exists user_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  place_id text,
  event_type text not null,
  event_value numeric,
  tags text[] default '{}',
  category text,
  metadata jsonb,
  created_at timestamptz default now()
);
alter table user_events enable row level security;
drop policy if exists "events own" on user_events;
create policy "events own" on user_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists user_events_user_idx on user_events(user_id);

create table if not exists user_taste_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  tag_scores jsonb default '{}',
  disliked_tags text[] default '{}',
  favorite_areas text[] default '{}',
  updated_at timestamptz default now()
);
alter table user_taste_profiles enable row level security;
drop policy if exists "taste read" on user_taste_profiles;
create policy "taste read" on user_taste_profiles for select using (true);
drop policy if exists "taste write own" on user_taste_profiles;
create policy "taste write own" on user_taste_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
