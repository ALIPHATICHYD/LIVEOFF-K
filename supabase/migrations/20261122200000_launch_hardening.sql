-- Launch hardening for the first 1,000 users.
-- 1. Payments: one atomic function records Paystack charges (idempotent, handles late payments),
--    staff release/refund can't run twice, concurrent "Pay" clicks can't fail.
-- 2. Background jobs: expire abandoned checkouts, auto-approve release 48h after move-in.
-- 3. Mass assignment: fields people must never set themselves are forced server-side.
-- 4. Rate limits on everything a signed-in user can insert through the public API.
--
-- Safe to run once on the live database. Rollback notes are at the bottom.

-- 1. Payments ---------------------------------------------------------------------

alter table public.payments
  add column if not exists provider_reference text,    -- the Paystack reference that actually paid
  add column if not exists needs_refund_at timestamptz, -- money arrived but the order could not be honoured
  add column if not exists review_note text;

-- Every Paystack confirmation we receive (webhook or return page). Staff-only audit trail.
create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  reference text not null,
  source text not null check (source in ('webhook', 'return', 'staff')),
  provider_status text not null,
  amount_kobo bigint,
  currency text,
  outcome text,
  received_at timestamptz not null default now(),
  unique (reference, source, provider_status)
);
alter table public.payment_events enable row level security;
drop policy if exists "staff read payment events" on public.payment_events;
create policy "staff read payment events" on public.payment_events for select using (public.is_admin());

/**
 * Record a Paystack charge. Called only by the server with the secret key (webhook + return page).
 * Accepts the payment reference or a checkout attempt reference "<reference>-<suffix>".
 * Locks the payment row, so the webhook and the return page can race safely.
 */
create or replace function public.record_paystack_charge(
  p_reference text, p_status text, p_amount bigint, p_currency text, p_source text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  base text := substring(p_reference from '^(LK-[0-9A-F]{32})');
  p public.payments;
  outcome text;
begin
  if base is null then return 'unknown_reference'; end if;

  select * into p from public.payments where reference = base for update;
  if not found then
    outcome := 'unknown_reference';
  elsif p_status <> 'success' or p_currency <> 'NGN' then
    outcome := 'ignored';
  elsif p_amount <> p.total_kobo then
    update public.payments set review_note = format('Paystack charge %s for %s kobo, expected %s', p_reference, p_amount, p.total_kobo),
      updated_at = now() where id = p.id;
    outcome := 'amount_mismatch';
  elsif p.status = 'pending' then
    update public.payments set status = 'held', paid_at = now(), provider_reference = p_reference, updated_at = now()
    where id = p.id;
    outcome := 'held';
  elsif p.status in ('cancelled', 'failed') and p.paid_at is null then
    -- Paid after the checkout expired. Honour it if nobody else has the item/room, else flag a refund.
    if p.market_item_id is not null then
      perform 1 from public.market_items where id = p.market_item_id for update;
      if exists (select 1 from public.market_items where id = p.market_item_id and status = 'active')
         and not exists (select 1 from public.payments o where o.market_item_id = p.market_item_id and o.id <> p.id
                         and o.status in ('pending', 'held', 'release_approved', 'disputed')) then
        update public.payments set status = 'held', paid_at = now(), provider_reference = p_reference, updated_at = now() where id = p.id;
        update public.market_items set status = 'reserved', updated_at = now() where id = p.market_item_id;
        outcome := 'held_late';
      end if;
    else
      -- a newer unpaid checkout for the same room is replaced by the one that was actually paid
      update public.payments set status = 'cancelled', updated_at = now()
       where listing_id = p.listing_id and student_id = p.student_id and id <> p.id and status = 'pending';
    end if;
    if p.market_item_id is null and not exists (
         select 1 from public.payments o where o.listing_id = p.listing_id and o.student_id = p.student_id
         and o.id <> p.id and o.status in ('pending', 'held', 'moved_in', 'release_approved', 'disputed')) then
      update public.payments set status = 'held', paid_at = now(), provider_reference = p_reference, updated_at = now() where id = p.id;
      outcome := 'held_late';
    end if;
    if outcome is null then
      update public.payments set needs_refund_at = now(), paid_at = now(), provider_reference = p_reference,
        review_note = 'Paid after checkout expired and the item/room was no longer free. Refund the student.',
        updated_at = now() where id = p.id;
      outcome := 'needs_refund';
    end if;
  elsif p.provider_reference is not null and p.provider_reference <> p_reference then
    -- a second successful checkout for an order that was already paid (two tabs): money in twice
    update public.payments set review_note = format('Second charge %s on an already paid order. Refund it in Paystack.', p_reference),
      updated_at = now() where id = p.id;
    outcome := 'duplicate_charge';
  else
    outcome := 'already_recorded';
  end if;

  insert into public.payment_events (reference, source, provider_status, amount_kobo, currency, outcome)
  values (p_reference, p_source, p_status, p_amount, p_currency, outcome)
  on conflict (reference, source, provider_status) do nothing;
  return outcome;
end;
$$;
revoke execute on function public.record_paystack_charge(text, text, bigint, text, text) from public, anon, authenticated;
grant execute on function public.record_paystack_charge(text, text, bigint, text, text) to service_role;

-- Two clicks on "Pay" at the same time used to hit the unique index and show an error.
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
  begin
    insert into public.payments (listing_id, student_id, landlord_id, rent_kobo, agent_fee_kobo, caution_fee_kobo,
                                 other_fees_kobo, service_fee_kobo, total_kobo)
    values (l.id, auth.uid(), l.owner_id, l.rent_per_year_kobo, l.agent_fee_kobo, l.caution_fee_kobo, l.other_fees_kobo,
            public.service_fee_kobo(),
            l.rent_per_year_kobo + l.agent_fee_kobo + l.caution_fee_kobo + l.other_fees_kobo + public.service_fee_kobo())
    returning * into p;
  exception when unique_violation then
    select * into p from public.payments where listing_id = p_listing and student_id = auth.uid()
      and status in ('pending', 'held', 'moved_in', 'release_approved', 'disputed');
  end;
  return p;
end;
$$;

-- Staff payout and refund: one atomic update each, so a double click or two staff members
-- can't release twice, and a dispute opened a second earlier can't be overwritten.
create or replace function public.admin_mark_released(p_payment uuid, p_payout_reference text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'staff only'; end if;
  if coalesce(trim(p_payout_reference), '') = '' then raise exception 'payout reference required'; end if;
  update public.payments
     set status = 'released', released_at = now(), payout_reference = left(trim(p_payout_reference), 120), updated_at = now()
   where id = p_payment
     and (status = 'release_approved' or (status = 'moved_in' and release_due_at < now()));
  if not found then raise exception 'payment cannot be released'; end if;
end;
$$;

create or replace function public.admin_mark_refunded(p_payment uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'staff only'; end if;
  update public.payments
     set status = 'refunded', refunded_at = now(), updated_at = now()
   where id = p_payment
     and (status in ('held', 'moved_in', 'disputed') or (status = 'cancelled' and needs_refund_at is not null));
  if not found then raise exception 'payment cannot be refunded'; end if;
end;
$$;

-- Only free a market item if no other live checkout holds it (a late refund must not free someone else's reservation).
create or replace function public.market_release_item()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.market_item_id is not null and new.status in ('cancelled', 'failed', 'refunded')
     and old.status is distinct from new.status
     and not exists (select 1 from public.payments o where o.market_item_id = new.market_item_id and o.id <> new.id
                     and o.status in ('pending', 'held', 'release_approved', 'disputed')) then
    update public.market_items set status = 'active', updated_at = now()
    where id = new.market_item_id and status = 'reserved';
  end if;
  return new;
end;
$$;

-- 2. Background jobs -----------------------------------------------------------------

/** Runs every 10 minutes (pg_cron below). Safe to run by hand: select public.run_escrow_jobs(); */
create or replace function public.run_escrow_jobs()
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- abandoned market checkouts free the item after 30 minutes
  update public.payments set status = 'cancelled', updated_at = now()
   where market_item_id is not null and status = 'pending' and created_at < now() - interval '30 minutes';
  -- abandoned room checkouts expire after a day (a late payment is still recorded, see record_paystack_charge)
  update public.payments set status = 'cancelled', updated_at = now()
   where listing_id is not null and status = 'pending' and created_at < now() - interval '24 hours';
  -- 48 hours after move-in with no dispute, release is approved automatically
  update public.payments set status = 'release_approved', release_approved_at = now(), updated_at = now()
   where status = 'moved_in' and release_due_at < now();
end;
$$;
revoke execute on function public.run_escrow_jobs() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.schedule('liveoff-escrow-jobs', '*/10 * * * *', 'select public.run_escrow_jobs()');
exception when others then
  raise notice 'pg_cron not available (%). Enable it in Database > Extensions, then run this block again.', sqlerrm;
end;
$$;

-- 3. Mass assignment ---------------------------------------------------------------
-- Anyone can call the Supabase API directly with the public key, so these rules live in the database,
-- not in the Next.js forms. Staff tools (service role, SQL editor, security definer functions) are not affected.

create or replace function public.is_end_user()
returns boolean language sql stable set search_path = '' as $$
  select current_user in ('anon', 'authenticated') and not public.is_admin();
$$;

/** created_at is always the server's clock: no faking "newest" to stay at the top of lists. */
create or replace function public.keep_created_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_end_user() then
    if tg_op = 'INSERT' then new.created_at := now(); else new.created_at := old.created_at; end if;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'listings', 'listing_photos', 'inspections', 'complaints', 'support_threads',
                           'support_messages', 'market_items', 'market_requests', 'market_wanted', 'market_offers',
                           'campus_waitlist', 'saved_listings', 'market_saved'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_keep_created_at', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.keep_created_at()',
                   t || '_keep_created_at', t);
  end loop;
end;
$$;

/** Inspections: students book and cancel; landlords confirm, complete or mark no-show. Nobody re-points a booking. */
create or replace function public.protect_inspection()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not public.is_end_user() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'requested';
    return new;
  end if;
  new.listing_id := old.listing_id;
  new.student_id := old.student_id;
  if new.status is distinct from old.status then
    if auth.uid() = old.student_id and new.status = 'cancelled' and old.status in ('requested', 'confirmed') then
      null; -- student cancels
    elsif public.owns_listing(old.listing_id) and new.status in ('confirmed', 'completed', 'no_show', 'cancelled') then
      null; -- landlord/agent manages the visit
    else
      new.status := old.status;
    end if;
  end if;
  if auth.uid() <> old.student_id then new.requested_for := old.requested_for; new.note := old.note; end if;
  return new;
end;
$$;
drop trigger if exists inspections_protect on public.inspections;
create trigger inspections_protect before insert or update on public.inspections
  for each row execute function public.protect_inspection();

/** Complaints always start open; only staff move them on (staff update policy already exists). */
create or replace function public.protect_complaint()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_end_user() then new.status := 'open'; end if;
  return new;
end;
$$;
drop trigger if exists complaints_protect on public.complaints;
create trigger complaints_protect before insert on public.complaints
  for each row execute function public.protect_complaint();

/** Support threads start open and can only point at the user's own payment. */
create or replace function public.protect_support_thread()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_end_user() then
    new.status := 'open';
    new.updated_at := now();
    if new.payment_id is not null and not exists (
      select 1 from public.payments where id = new.payment_id and (student_id = auth.uid() or landlord_id = auth.uid())) then
      new.payment_id := null;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists support_threads_protect on public.support_threads;
create trigger support_threads_protect before insert on public.support_threads
  for each row execute function public.protect_support_thread();

-- Wanted posts: owners can close them and edit the text, not move them to another campus.
create or replace function public.protect_market_wanted()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_end_user() then
    new.user_id := old.user_id;
    new.university_id := old.university_id;
  end if;
  return new;
end;
$$;
drop trigger if exists market_wanted_protect on public.market_wanted;
create trigger market_wanted_protect before update on public.market_wanted
  for each row execute function public.protect_market_wanted();

-- 4. Rate limits -----------------------------------------------------------------
-- Counts the caller's own recent rows (RLS lets them see their own), so it runs as the caller.
-- Usage: rate_limit('<owner column>', '<max rows>', '<window>')

create or replace function public.rate_limit()
returns trigger language plpgsql set search_path = '' as $$
declare
  n int;
begin
  if not public.is_end_user() or auth.uid() is null then return new; end if;
  execute format('select count(*) from %I.%I where %I = $1 and created_at > now() - $2::interval',
                 tg_table_schema, tg_table_name, tg_argv[0])
    into n using auth.uid(), tg_argv[2];
  if n >= tg_argv[1]::int then
    raise exception 'Too many requests. Please wait a little and try again.' using errcode = 'P0429';
  end if;
  return new;
end;
$$;

create index if not exists support_messages_sender_idx on public.support_messages (sender_id, created_at);
create index if not exists complaints_reporter_idx on public.complaints (reporter_id, created_at);
create index if not exists inspections_student_created_idx on public.inspections (student_id, created_at);
create index if not exists market_requests_buyer_idx on public.market_requests (buyer_id, created_at);
create index if not exists market_offers_seller_idx on public.market_offers (seller_id, created_at);
create index if not exists market_wanted_user_idx on public.market_wanted (user_id, created_at);
create index if not exists market_items_seller_created_idx on public.market_items (seller_id, created_at);
create index if not exists listings_owner_created_idx on public.listings (owner_id, created_at);
create index if not exists support_threads_user_created_idx on public.support_threads (user_id, created_at);

do $$
declare r record;
begin
  for r in select * from (values
    ('support_messages', 'sender_id',   '30', '10 minutes'),
    ('support_threads',  'user_id',     '10', '1 day'),
    ('complaints',       'reporter_id', '10', '1 day'),
    ('inspections',      'student_id',  '10', '1 day'),
    ('listings',         'owner_id',    '20', '1 day'),
    ('market_items',     'seller_id',   '20', '1 day'),
    ('market_requests',  'buyer_id',    '30', '1 day'),
    ('market_offers',    'seller_id',   '30', '1 day'),
    ('market_wanted',    'user_id',     '10', '1 day')
  ) as v(tbl, col, max_rows, win) loop
    execute format('drop trigger if exists %I on public.%I', r.tbl || '_rate_limit', r.tbl);
    execute format('create trigger %I before insert on public.%I for each row execute function public.rate_limit(%L, %L, %L)',
                   r.tbl || '_rate_limit', r.tbl, r.col, r.max_rows, r.win);
  end loop;
end;
$$;

-- Rollback (only if something breaks; run in the SQL editor):
--   select cron.unschedule('liveoff-escrow-jobs');
--   drop trigger <table>_rate_limit / <table>_keep_created_at / inspections_protect / complaints_protect /
--     support_threads_protect / market_wanted_protect on the tables above.
--   The new columns and payment_events table are additive and can stay.
