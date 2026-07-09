-- Lint fix: RLS was never enabled on the two booking scaffolding tables
-- (their sibling `reservations` got it in booking.sql). They hold public
-- reference data (slots/capacities), so: readable by everyone, writable by
-- no one through the API — admin/backend writes use the service role, which
-- bypasses RLS.

alter table reservation_availability enable row level security;
drop policy if exists "availability public read" on reservation_availability;
create policy "availability public read" on reservation_availability for select using (true);

alter table restaurant_tables enable row level security;
drop policy if exists "tables public read" on restaurant_tables;
create policy "tables public read" on restaurant_tables for select using (true);
