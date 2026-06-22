-- Review photos: column on reviews + a public storage bucket.
alter table reviews add column if not exists photo_urls text[] default '{}';

insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

drop policy if exists "review photos read" on storage.objects;
create policy "review photos read" on storage.objects
  for select using (bucket_id = 'review-photos');

drop policy if exists "review photos upload" on storage.objects;
create policy "review photos upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'review-photos');
