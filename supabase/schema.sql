-- Sipp database schema + security rules.
-- Run this once in Supabase → SQL Editor → New query → paste → Run.
-- Cafés stay in the app code; everything user-generated lives here.

-- ========== PROFILES ==========
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique,
  name text,
  bio text,
  avatar_url text,
  taste_tags text[] default '{}',
  pref_cafes text[] default '{}',
  created_at timestamptz default now()
);
alter table profiles enable row level security;
drop policy if exists "profiles read" on profiles;
create policy "profiles read" on profiles for select using (true);
drop policy if exists "profiles update own" on profiles;
create policy "profiles update own" on profiles for update using (auth.uid() = id);
drop policy if exists "profiles insert own" on profiles;
create policy "profiles insert own" on profiles for insert with check (auth.uid() = id);

-- Auto-create a profile row when a user signs up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username, name)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'name')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- ========== SAVES (status flags per café) ==========
create table if not exists saves (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  place_id text not null,
  saved boolean default false,
  want boolean default false,
  been boolean default false,
  loved boolean default false,
  notfor boolean default false,
  liked boolean default false,
  updated_at timestamptz default now(),
  unique (user_id, place_id)
);
alter table saves enable row level security;
drop policy if exists "saves read" on saves;
create policy "saves read" on saves for select using (true);
drop policy if exists "saves write own" on saves;
create policy "saves write own" on saves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========== REVIEWS ==========
create table if not exists reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  place_id text not null,
  overall numeric,
  drink numeric, food numeric, vibe numeric, service numeric, value numeric, work numeric, aesthetic numeric,
  review_text text,
  best_item text,
  would_go_again boolean,
  visit_date date,
  crowd_level text,
  best_time text,
  vibe_tags text[] default '{}',
  created_at timestamptz default now(),
  unique (user_id, place_id)
);
alter table reviews enable row level security;
drop policy if exists "reviews read" on reviews;
create policy "reviews read" on reviews for select using (true);
drop policy if exists "reviews write own" on reviews;
create policy "reviews write own" on reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========== LISTS ==========
create table if not exists lists (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  is_public boolean default true,
  cover_place_id text,
  created_at timestamptz default now()
);
alter table lists enable row level security;
drop policy if exists "lists read" on lists;
create policy "lists read" on lists for select using (is_public or auth.uid() = user_id);
drop policy if exists "lists write own" on lists;
create policy "lists write own" on lists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists list_items (
  id bigint generated always as identity primary key,
  list_id bigint not null references lists on delete cascade,
  place_id text not null,
  created_at timestamptz default now(),
  unique (list_id, place_id)
);
alter table list_items enable row level security;
drop policy if exists "list_items read" on list_items;
create policy "list_items read" on list_items for select using (true);
drop policy if exists "list_items write own" on list_items;
create policy "list_items write own" on list_items for all
  using (exists (select 1 from lists l where l.id = list_id and l.user_id = auth.uid()))
  with check (exists (select 1 from lists l where l.id = list_id and l.user_id = auth.uid()));

-- ========== FOLLOWS ==========
create table if not exists follows (
  follower_id uuid not null references auth.users on delete cascade,
  following_id uuid not null references auth.users on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);
alter table follows enable row level security;
drop policy if exists "follows read" on follows;
create policy "follows read" on follows for select using (true);
drop policy if exists "follows write own" on follows;
create policy "follows write own" on follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- ========== REVIEW LIKES ==========
create table if not exists review_likes (
  user_id uuid not null references auth.users on delete cascade,
  review_id bigint not null references reviews on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, review_id)
);
alter table review_likes enable row level security;
drop policy if exists "likes read" on review_likes;
create policy "likes read" on review_likes for select using (true);
drop policy if exists "likes write own" on review_likes;
create policy "likes write own" on review_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========== COMMENTS ==========
create table if not exists comments (
  id bigint generated always as identity primary key,
  review_id bigint not null references reviews on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  text text not null,
  created_at timestamptz default now()
);
alter table comments enable row level security;
drop policy if exists "comments read" on comments;
create policy "comments read" on comments for select using (true);
drop policy if exists "comments write own" on comments;
create policy "comments write own" on comments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
