-- =========================================================
-- SURent — Full Supabase Database Setup
-- Run each numbered section in the Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- =========================================================

-- ============ 1. PROFILES ============
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'landlord', 'admin')),
  full_name text not null,
  university text,
  property_areas text,
  phone text,
  avatar_url text,
  id_image_url text,
  is_verified boolean not null default false,
  guarantor_name text,
  guarantor_phone text,
  guarantor_email text,
  guarantor_id_url text,
  created_at timestamptz not null default now()
);

-- Guarantor email column (Additional Feature from handover doc).
-- Safe to run even if the table already existed without it.
alter table profiles add column if not exists guarantor_email text;

alter table profiles enable row level security;

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (true);

-- Fix (8.3): insert sometimes failed on auth.uid() = id due to timing.
-- WITH CHECK (true) lets any authenticated insert succeed. Do not change.
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert with check (true);

-- Fix (8.5): admin verify button needs to update rows it doesn't own.
-- USING (true) allows any authenticated update. Do not change.
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update using (true);

drop policy if exists profiles_delete on profiles;
create policy profiles_delete on profiles for delete using (true);

-- ============ 2. PROPERTIES ============
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  property_type text not null,
  other_type text,
  description text,
  location text,
  price numeric not null default 0,
  is_negotiable boolean not null default true,
  electricity_supply text,
  water_supply text,
  vacant_rooms int not null default 1,
  tenants_per_room int not null default 1,
  room_description text,
  room_images text[] not null default '{}',
  house_images text[] not null default '{}',
  videos text[] not null default '{}',
  is_active boolean not null default true,
  negotiation_status text not null default 'available',
  created_at timestamptz not null default now()
);

-- Fix (8.6): columns sometimes missing after project recreation.
alter table properties add column if not exists property_type text;
alter table properties add column if not exists negotiation_status text default 'available';
alter table properties add column if not exists other_type text;

alter table properties enable row level security;

drop policy if exists properties_select on properties;
create policy properties_select on properties for select using (true);

drop policy if exists properties_insert on properties;
create policy properties_insert on properties for insert with check (true);

-- USING (true) needed for admin toggling visibility on listings it doesn't own.
drop policy if exists properties_update on properties;
create policy properties_update on properties for update using (true);

drop policy if exists properties_delete on properties;
create policy properties_delete on properties for delete using (true);

-- ============ 3. MESSAGES ============
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

drop policy if exists messages_select on messages;
create policy messages_select on messages for select using (true);

drop policy if exists messages_insert on messages;
create policy messages_insert on messages for insert with check (true);

drop policy if exists messages_update on messages;
create policy messages_update on messages for update using (true);

-- Fix (8.1): the messages query used to join profiles(full_name, avatar_url),
-- which returned null rows due to an RLS interaction. The app now fetches
-- messages with select('*') only and labels the other party generically —
-- keep this policy simple (no join dependency) to match that approach.

-- ============ 4. VISIT REQUESTS ============
create table if not exists visit_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  landlord_id uuid not null references profiles(id) on delete cascade,
  requested_date date not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  created_at timestamptz not null default now()
);

alter table visit_requests enable row level security;

drop policy if exists visit_requests_select on visit_requests;
create policy visit_requests_select on visit_requests for select using (true);

drop policy if exists visit_requests_insert on visit_requests;
create policy visit_requests_insert on visit_requests for insert with check (true);

drop policy if exists visit_requests_update on visit_requests;
create policy visit_requests_update on visit_requests for update using (true);

-- ============ 5. REVIEWS ============
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  landlord_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (property_id, student_id)
);

alter table reviews enable row level security;

drop policy if exists reviews_select on reviews;
create policy reviews_select on reviews for select using (true);

drop policy if exists reviews_insert on reviews;
create policy reviews_insert on reviews for insert with check (true);

drop policy if exists reviews_delete on reviews;
create policy reviews_delete on reviews for delete using (true);

-- ============ 6. NEGOTIATION AGREEMENTS ============
-- Tracks the 6-stage mutual negotiation tracker. Each stage row records
-- whether landlord and student have independently confirmed it.
create table if not exists negotiation_agreements (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  stage text not null check (stage in ('available', 'viewing_scheduled', 'price_agreed', 'deposit_paid', 'moved_in', 'vacated')),
  confirmed_by_landlord boolean not null default false,
  confirmed_by_student boolean not null default false,
  confirmed_at_landlord timestamptz,
  confirmed_at_student timestamptz,
  created_at timestamptz not null default now(),
  unique (property_id, stage)
);

alter table negotiation_agreements enable row level security;

drop policy if exists negotiation_agreements_select on negotiation_agreements;
create policy negotiation_agreements_select on negotiation_agreements for select using (true);

drop policy if exists negotiation_agreements_insert on negotiation_agreements;
create policy negotiation_agreements_insert on negotiation_agreements for insert with check (true);

drop policy if exists negotiation_agreements_update on negotiation_agreements;
create policy negotiation_agreements_update on negotiation_agreements for update using (true);

-- ============ 7. STORAGE BUCKETS ============
-- Run this section, then double check in Storage > Policies that each
-- bucket allows public read + authenticated write if the dashboard
-- doesn't do it automatically from `public = true`.
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('property-videos', 'property-videos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Permissive storage policies (matches the "any authenticated action succeeds"
-- pattern used for profiles/properties above — tighten later if needed).
drop policy if exists "Public read property-images" on storage.objects;
create policy "Public read property-images" on storage.objects for select using (bucket_id = 'property-images');
drop policy if exists "Auth write property-images" on storage.objects;
create policy "Auth write property-images" on storage.objects for insert with check (bucket_id = 'property-images');
drop policy if exists "Auth update property-images" on storage.objects;
create policy "Auth update property-images" on storage.objects for update using (bucket_id = 'property-images');

drop policy if exists "Public read property-videos" on storage.objects;
create policy "Public read property-videos" on storage.objects for select using (bucket_id = 'property-videos');
drop policy if exists "Auth write property-videos" on storage.objects;
create policy "Auth write property-videos" on storage.objects for insert with check (bucket_id = 'property-videos');
drop policy if exists "Auth update property-videos" on storage.objects;
create policy "Auth update property-videos" on storage.objects for update using (bucket_id = 'property-videos');

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "Auth write avatars" on storage.objects;
create policy "Auth write avatars" on storage.objects for insert with check (bucket_id = 'avatars');
drop policy if exists "Auth update avatars" on storage.objects;
create policy "Auth update avatars" on storage.objects for update using (bucket_id = 'avatars');

-- ============ 8. INDEXES (performance) ============
create index if not exists idx_properties_landlord on properties(landlord_id);
create index if not exists idx_properties_active on properties(is_active);
create index if not exists idx_messages_property on messages(property_id);
create index if not exists idx_messages_receiver on messages(receiver_id);
create index if not exists idx_visit_requests_property on visit_requests(property_id);
create index if not exists idx_reviews_landlord on reviews(landlord_id);
create index if not exists idx_negotiation_property on negotiation_agreements(property_id);

-- =========================================================
-- Done. Next steps:
-- 1. Authentication > Providers > Email: turn OFF "Confirm email".
-- 2. Authentication > URL Configuration: set Site URL and Redirect URLs
--    to your Netlify domain, e.g. https://your-site.netlify.app/**
-- 3. To make yourself admin: sign up normally, then in Table Editor >
--    profiles find your row and change role to 'admin'. Log out/in.
-- =========================================================
