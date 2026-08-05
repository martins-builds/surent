-- Run this in Supabase SQL Editor. Safe to re-run.

create table if not exists guarantor_links (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

alter table guarantor_links enable row level security;

-- Anyone holding the token can look up the row (the token itself is the
-- secret — this is intentionally public so the emailed link works without
-- an account).
drop policy if exists guarantor_links_select on guarantor_links;
create policy guarantor_links_select on guarantor_links for select using (true);

drop policy if exists guarantor_links_insert on guarantor_links;
create policy guarantor_links_insert on guarantor_links for insert with check (true);

create index if not exists idx_guarantor_links_token on guarantor_links(token);
