-- LiveOff-K initial schema
-- Structure: university -> area -> listing, so a new campus is new rows, not new code.

create extension if not exists "pgcrypto";

-- Roles --------------------------------------------------------------------
create type public.user_role as enum ('student', 'landlord', 'agent', 'admin');
create type public.listing_status as enum ('draft', 'pending_review', 'inspection_scheduled', 'verified', 'rejected', 'suspended', 'let');
create type public.property_type as enum ('self_contained', 'single_room', 'shared_apartment', 'one_bedroom', 'two_bedroom', 'student_hostel');
create type public.inspection_status as enum ('requested', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.complaint_status as enum ('open', 'investigating', 'resolved', 'dismissed');

-- Places -------------------------------------------------------------------
create table public.universities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text,
  city text not null,
  state text not null,
  is_live boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  slug text not null,
  name text not null,
  unique (university_id, slug)
);

-- People -------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  full_name text,
  phone text,
  university_id uuid references public.universities(id),
  -- landlords and agents must be checked by staff before their listings can go live
  identity_verified_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  wanted text := new.raw_user_meta_data ->> 'account_type';
begin
  -- Landlords and agents can self-select their account type, but nothing they list
  -- goes live until staff verify it. Admin is never self-assigned.
  insert into public.profiles (id, phone, full_name, role)
  values (new.id, new.phone, new.raw_user_meta_data ->> 'full_name',
          case when wanted in ('landlord', 'agent') then wanted::public.user_role else 'student' end);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.app_role()
returns public.user_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- Users can edit their own profile but never their own role or verification.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- auth.uid() is null for the service role and the SQL editor: staff tools may change anything
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.identity_verified_at := old.identity_verified_at;
    new.suspended_at := old.suspended_at;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Listings -----------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id),
  area_id uuid not null references public.areas(id),
  title text not null check (char_length(title) between 5 and 120),
  description text not null default '',
  property_type public.property_type not null,
  bedrooms smallint not null default 1 check (bedrooms between 0 and 10),
  furnished boolean not null default false,
  -- all money in kobo (integer) to avoid rounding errors
  rent_per_year_kobo bigint not null check (rent_per_year_kobo > 0),
  agent_fee_kobo bigint not null default 0 check (agent_fee_kobo >= 0),
  caution_fee_kobo bigint not null default 0 check (caution_fee_kobo >= 0),
  other_fees_kobo bigint not null default 0 check (other_fees_kobo >= 0),
  other_fees_note text,
  min_rental_months smallint not null default 12,
  available_from date,
  facilities text[] not null default '{}',
  minutes_to_gate smallint,
  -- private: shown only after an inspection is booked
  address text not null,
  status public.listing_status not null default 'draft',
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  is_featured boolean not null default false,
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_browse_idx on public.listings (university_id, status, rent_per_year_kobo);
create index listings_area_idx on public.listings (area_id);
create index listings_owner_idx on public.listings (owner_id);
create index listings_search_idx on public.listings using gin (search);

-- Featured never means verified: only staff can change status/verification.
create or replace function public.protect_listing_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.status not in ('draft', 'pending_review') then new.status := 'draft'; end if;
      new.verified_at := null; new.verified_by := null; new.is_featured := false;
    else
      -- owners may only move draft -> pending_review, or back to draft before review
      if new.status is distinct from old.status
         and not (old.status in ('draft', 'rejected') and new.status = 'pending_review')
         and not (old.status = 'pending_review' and new.status = 'draft') then
        new.status := old.status;
      end if;
      new.verified_at := old.verified_at; new.verified_by := old.verified_by; new.is_featured := old.is_featured;
      -- editing price or address after verification sends it back for review
      if old.status = 'verified' and (
        new.rent_per_year_kobo <> old.rent_per_year_kobo or new.agent_fee_kobo <> old.agent_fee_kobo or
        new.caution_fee_kobo <> old.caution_fee_kobo or new.other_fees_kobo <> old.other_fees_kobo or
        new.address <> old.address) then
        new.status := 'pending_review'; new.verified_at := null; new.verified_by := null;
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger listings_protect_fields
  before insert or update on public.listings
  for each row execute function public.protect_listing_fields();

create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index listing_photos_listing_idx on public.listing_photos (listing_id, sort_order);

-- Proof of ownership / authority to let. Private bucket, admin + uploader only.
create table public.listing_documents (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  kind text not null check (kind in ('owner_id', 'authority_letter', 'ownership_proof', 'other')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- What staff checked during verification (shown publicly as "What we checked").
create table public.verification_checks (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  check_key text not null,
  label text not null,
  passed boolean not null,
  notes text,
  checked_by uuid not null references public.profiles(id),
  checked_at timestamptz not null default now(),
  unique (listing_id, check_key)
);

-- Inspections --------------------------------------------------------------
create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  requested_for timestamptz not null,
  status public.inspection_status not null default 'requested',
  note text,
  created_at timestamptz not null default now()
);
create index inspections_listing_idx on public.inspections (listing_id);
create index inspections_student_idx on public.inspections (student_id);

-- Complaints and reports ---------------------------------------------------
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  subject text not null,
  details text not null,
  is_suspicious_listing boolean not null default false,
  status public.complaint_status not null default 'open',
  created_at timestamptz not null default now()
);

-- Helpers used by policies. security definer so they can read listings past RLS
-- (a student cannot select the listings table directly, only the public view).
create or replace function public.listing_is_verified(lid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.listings where id = lid and status = 'verified');
$$;

create or replace function public.owns_listing(lid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.listings where id = lid and owner_id = auth.uid());
$$;

create or replace function public.owns_listing_path(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.listings
                 where id::text = (storage.foldername(object_name))[1] and owner_id = auth.uid());
$$;

-- Row-level security -------------------------------------------------------
alter table public.universities enable row level security;
alter table public.areas enable row level security;
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.listing_documents enable row level security;
alter table public.verification_checks enable row level security;
alter table public.inspections enable row level security;
alter table public.complaints enable row level security;

create policy "places are public" on public.universities for select using (true);
create policy "areas are public" on public.areas for select using (true);
create policy "admins manage universities" on public.universities for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage areas" on public.areas for all using (public.is_admin()) with check (public.is_admin());

create policy "read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "update own profile" on public.profiles for update using (id = auth.uid() or public.is_admin());

-- Public sees verified listings only; owners see their own; admins see all.
-- The address column is hidden from the public through the listings_public view.
create policy "owners and admins read listings" on public.listings for select
  using (owner_id = auth.uid() or public.is_admin());
create policy "landlords and agents create listings" on public.listings for insert
  with check (owner_id = auth.uid() and public.app_role() in ('landlord', 'agent', 'admin'));
create policy "owners update listings" on public.listings for update
  using (owner_id = auth.uid() or public.is_admin());
create policy "admins delete listings" on public.listings for delete using (public.is_admin());

create view public.listings_public with (security_invoker = false) as
  select l.id, l.university_id, l.area_id, l.title, l.description, l.property_type, l.bedrooms,
         l.furnished, l.rent_per_year_kobo, l.agent_fee_kobo, l.caution_fee_kobo, l.other_fees_kobo,
         l.other_fees_note, l.min_rental_months, l.available_from, l.facilities, l.minutes_to_gate,
         l.verified_at, l.is_featured, l.search, l.created_at,
         a.name as area_name, a.slug as area_slug, u.slug as university_slug, u.name as university_name
  from public.listings l
  join public.areas a on a.id = l.area_id
  join public.universities u on u.id = l.university_id
  where l.status = 'verified';
grant select on public.listings_public to anon, authenticated;

create policy "photos of visible listings" on public.listing_photos for select using (
  public.listing_is_verified(listing_id) or public.owns_listing(listing_id) or public.is_admin());
create policy "owners manage photos" on public.listing_photos for all
  using (public.owns_listing(listing_id) or public.is_admin())
  with check (public.owns_listing(listing_id) or public.is_admin());

create policy "owners and admins read documents" on public.listing_documents for select using (
  public.owns_listing(listing_id) or public.is_admin());
create policy "owners add documents" on public.listing_documents for insert with check (
  public.owns_listing(listing_id));

create policy "checks of verified listings are public" on public.verification_checks for select using (
  public.listing_is_verified(listing_id) or public.owns_listing(listing_id) or public.is_admin());
create policy "admins record checks" on public.verification_checks for all using (public.is_admin()) with check (public.is_admin());

create policy "students book inspections" on public.inspections for insert with check (
  student_id = auth.uid() and public.listing_is_verified(listing_id));
create policy "parties read inspections" on public.inspections for select using (
  student_id = auth.uid() or public.owns_listing(listing_id) or public.is_admin());
create policy "parties update inspections" on public.inspections for update using (
  student_id = auth.uid() or public.owns_listing(listing_id) or public.is_admin());

create policy "anyone signed in can complain" on public.complaints for insert with check (reporter_id = auth.uid());
create policy "reporters and admins read complaints" on public.complaints for select using (reporter_id = auth.uid() or public.is_admin());
create policy "admins handle complaints" on public.complaints for update using (public.is_admin());

-- Storage ------------------------------------------------------------------
-- Photos: public read, files stored as <listing_id>/<file>. Documents: private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-photos', 'listing-photos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png']),
  ('listing-documents', 'listing-documents', false, 10485760, array['image/webp', 'image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

create policy "owners upload listing photos" on storage.objects for insert to authenticated with check (
  bucket_id = 'listing-photos' and public.owns_listing_path(name));
create policy "owners delete listing photos" on storage.objects for delete to authenticated using (
  bucket_id = 'listing-photos' and (public.owns_listing_path(name) or public.is_admin()));

create policy "owners upload documents" on storage.objects for insert to authenticated with check (
  bucket_id = 'listing-documents' and public.owns_listing_path(name));
create policy "owners and admins read documents" on storage.objects for select to authenticated using (
  bucket_id = 'listing-documents' and (public.owns_listing_path(name) or public.is_admin()));
