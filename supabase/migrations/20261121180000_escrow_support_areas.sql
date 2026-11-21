-- v2: area map data, saved rooms, escrow payments and customer support.

-- Areas: travel time and position on the campus mini-map (percent of map width/height).
alter table public.areas
  add column minutes_to_campus smallint,
  add column map_x smallint check (map_x between 0 and 100),
  add column map_y smallint check (map_y between 0 and 100),
  add column sort_order smallint not null default 0;

alter table public.profiles add column email text;

-- Saved rooms ----------------------------------------------------------------
create table public.saved_listings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
alter table public.saved_listings enable row level security;
create policy "users manage their saved rooms" on public.saved_listings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Escrow payments --------------------------------------------------------------
-- Flow: pending -> held (paid into escrow) -> moved_in (48h to raise a problem)
--       -> release_approved (student confirmed, or 48h passed) -> released (landlord paid out by staff)
-- At any point before release the student can open a dispute; staff can refund.
create type public.payment_status as enum
  ('pending', 'held', 'moved_in', 'release_approved', 'released', 'disputed', 'refunded', 'failed', 'cancelled');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('LK-' || upper(replace(gen_random_uuid()::text, '-', ''))),
  listing_id uuid not null references public.listings(id),
  student_id uuid not null references public.profiles(id),
  landlord_id uuid not null references public.profiles(id),
  rent_kobo bigint not null,
  agent_fee_kobo bigint not null,
  caution_fee_kobo bigint not null,
  other_fees_kobo bigint not null,
  service_fee_kobo bigint not null,
  total_kobo bigint not null check (total_kobo > 0),
  status public.payment_status not null default 'pending',
  provider text not null default 'paystack',
  paid_at timestamptz,
  moved_in_at timestamptz,
  release_due_at timestamptz,
  release_approved_at timestamptz,
  released_at timestamptz,
  payout_reference text,
  disputed_at timestamptz,
  dispute_reason text,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_student_idx on public.payments (student_id, created_at desc);
create index payments_landlord_idx on public.payments (landlord_id);
create index payments_status_idx on public.payments (status);
-- one live escrow per student per room
create unique index payments_one_active_idx on public.payments (listing_id, student_id)
  where status in ('pending', 'held', 'moved_in', 'release_approved', 'disputed');

alter table public.payments enable row level security;
create policy "students, landlords and staff read payments" on public.payments for select
  using (student_id = auth.uid() or landlord_id = auth.uid() or public.is_admin());
-- Students never write payments directly: they use the functions below.
create policy "staff update payments" on public.payments for update using (public.is_admin());

-- Platform fee in kobo. Change here (or move to a settings table) once the fee model is final.
create or replace function public.service_fee_kobo() returns bigint language sql immutable as $$ select 500000::bigint $$;

/** Start (or reuse) an escrow payment. Amounts come from the listing, never from the client. */
create or replace function public.start_escrow_payment(p_listing uuid)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare
  l public.listings;
  p public.payments;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into l from public.listings where id = p_listing and status = 'verified';
  if not found then raise exception 'listing is not available'; end if;
  if not exists (select 1 from public.inspections i where i.listing_id = p_listing
                 and i.student_id = auth.uid() and i.status in ('requested', 'confirmed', 'completed')) then
    raise exception 'book an inspection before paying';
  end if;
  select * into p from public.payments where listing_id = p_listing and student_id = auth.uid()
    and status in ('pending', 'held', 'moved_in', 'release_approved', 'disputed');
  if found then return p; end if;
  insert into public.payments (listing_id, student_id, landlord_id, rent_kobo, agent_fee_kobo, caution_fee_kobo,
                               other_fees_kobo, service_fee_kobo, total_kobo)
  values (l.id, auth.uid(), l.owner_id, l.rent_per_year_kobo, l.agent_fee_kobo, l.caution_fee_kobo, l.other_fees_kobo,
          public.service_fee_kobo(),
          l.rent_per_year_kobo + l.agent_fee_kobo + l.caution_fee_kobo + l.other_fees_kobo + public.service_fee_kobo())
  returning * into p;
  return p;
end;
$$;

create or replace function public.confirm_moved_in(p_payment uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.payments set status = 'moved_in', moved_in_at = now(), release_due_at = now() + interval '48 hours', updated_at = now()
  where id = p_payment and student_id = auth.uid() and status = 'held';
  if not found then raise exception 'payment cannot be updated'; end if;
end;
$$;

create or replace function public.approve_release(p_payment uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.payments set status = 'release_approved', release_approved_at = now(), updated_at = now()
  where id = p_payment and student_id = auth.uid() and status = 'moved_in';
  if not found then raise exception 'payment cannot be updated'; end if;
end;
$$;

-- Support ----------------------------------------------------------------------
create type public.support_status as enum ('open', 'waiting_on_user', 'resolved');

create table public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null check (char_length(subject) between 2 and 120),
  payment_id uuid references public.payments(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  status public.support_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_threads_user_idx on public.support_threads (user_id, updated_at desc);
create index support_threads_status_idx on public.support_threads (status, updated_at desc);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  is_staff boolean not null default false,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index support_messages_thread_idx on public.support_messages (thread_id, created_at);

create or replace function public.owns_thread(tid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.support_threads where id = tid and user_id = auth.uid());
$$;

-- Only staff messages can be marked as staff; any new message bumps the thread.
create or replace function public.on_support_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.is_staff := public.is_admin();
  new.sender_id := coalesce(auth.uid(), new.sender_id);
  update public.support_threads
     set updated_at = now(),
         status = case when new.is_staff then 'waiting_on_user'::public.support_status else 'open'::public.support_status end
   where id = new.thread_id;
  return new;
end;
$$;
create trigger support_messages_before_insert before insert on public.support_messages
  for each row execute function public.on_support_message();

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;
create policy "users read own threads" on public.support_threads for select using (user_id = auth.uid() or public.is_admin());
create policy "users open threads" on public.support_threads for insert with check (user_id = auth.uid());
create policy "staff update threads" on public.support_threads for update using (public.is_admin());
create policy "read messages in own threads" on public.support_messages for select using (public.owns_thread(thread_id) or public.is_admin());
create policy "write messages in own threads" on public.support_messages for insert with check (public.owns_thread(thread_id) or public.is_admin());

/** Hold the money and open a support thread in one step. */
create or replace function public.open_dispute(p_payment uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  p public.payments;
  tid uuid;
begin
  update public.payments set status = 'disputed', disputed_at = now(), dispute_reason = left(p_reason, 1000), updated_at = now()
  where id = p_payment and student_id = auth.uid() and status in ('held', 'moved_in')
  returning * into p;
  if not found then raise exception 'payment cannot be disputed'; end if;
  insert into public.support_threads (user_id, subject, payment_id, listing_id)
  values (auth.uid(), 'Payment dispute', p.id, p.listing_id) returning id into tid;
  insert into public.support_messages (thread_id, sender_id, body) values (tid, auth.uid(), left(p_reason, 2000));
  return tid;
end;
$$;

-- Public view: expose area travel time for cards.
create or replace view public.listings_public with (security_invoker = false) as
  select l.id, l.university_id, l.area_id, l.title, l.description, l.property_type, l.bedrooms,
         l.furnished, l.rent_per_year_kobo, l.agent_fee_kobo, l.caution_fee_kobo, l.other_fees_kobo,
         l.other_fees_note, l.min_rental_months, l.available_from, l.facilities, l.minutes_to_gate,
         l.verified_at, l.is_featured, l.search, l.created_at,
         a.name as area_name, a.slug as area_slug, u.slug as university_slug, u.name as university_name,
         a.minutes_to_campus as area_minutes
  from public.listings l
  join public.areas a on a.id = l.area_id
  join public.universities u on u.id = l.university_id
  where l.status = 'verified';
grant select on public.listings_public to anon, authenticated;
