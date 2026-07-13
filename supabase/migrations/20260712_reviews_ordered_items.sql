-- Ordered-product persistence on reviews: what the reviewer actually ordered.
-- Item shape: { name, category, quantity, menu_price, paid_price, currency }
alter table public.reviews
  add column if not exists ordered_items jsonb not null default '[]'::jsonb;
