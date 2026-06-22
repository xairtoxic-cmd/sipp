-- Booking fields on places (link-first MVP).
alter table places add column if not exists accepts_reservations boolean default false;
alter table places add column if not exists booking_provider text;
alter table places add column if not exists booking_url text;
alter table places add column if not exists booking_phone text;
alter table places add column if not exists booking_whatsapp text;
alter table places add column if not exists reservation_notes text;
alter table places add column if not exists deposit_required boolean default false;
alter table places add column if not exists walk_in_only boolean default false;
alter table places add column if not exists booking_cta_enabled boolean default false;

-- Booking click tracking.
create table if not exists booking_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete set null,
  place_id text,
  booking_provider text,
  booking_url text,
  event_type text,
  party_size int,
  requested_date date,
  requested_time text,
  created_at timestamptz default now()
);
alter table booking_events enable row level security;
drop policy if exists "booking own" on booking_events;
create policy "booking own" on booking_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Future native booking (created but unused for MVP).
create table if not exists reservations (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  place_id text,
  party_size int,
  reservation_date date,
  reservation_time text,
  status text default 'pending',
  notes text,
  created_at timestamptz default now()
);
alter table reservations enable row level security;
drop policy if exists "reservations own" on reservations;
create policy "reservations own" on reservations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists reservation_availability (
  id bigint generated always as identity primary key,
  place_id text, date date, time text, capacity int, available_slots int
);
create table if not exists restaurant_tables (
  id bigint generated always as identity primary key,
  place_id text, table_name text, capacity int, active boolean default true
);

-- Seed: fine dining accepts reservations via website/phone; cafés are walk-in for MVP.
update places set
  accepts_reservations = true,
  booking_cta_enabled = true,
  walk_in_only = false,
  booking_url = case when website ~* '^https?://' then website else null end,
  booking_phone = nullif(phone, ''),
  booking_provider = case when website ~* '^https?://' then 'restaurant_website' when nullif(phone, '') is not null then 'phone' else 'none' end
where category = 'fine_dining';

update places set walk_in_only = true, accepts_reservations = false, booking_cta_enabled = false
where category = 'cafe';
