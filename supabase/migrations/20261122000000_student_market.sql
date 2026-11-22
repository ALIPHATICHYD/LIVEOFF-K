-- Student Market: students buy and sell used items near campus.
-- Buyers either pay through the same escrow as rent (payments table) or ask to meet on campus.

create type public.market_category as enum ('room', 'kitchen', 'power', 'study', 'gadgets', 'other');
create type public.market_condition as enum ('like_new', 'good', 'fair');
create type public.market_item_status as enum ('active', 'reserved', 'sold', 'removed');

create table public.market_items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id),
  area_id uuid not null references public.areas(id),
  category public.market_category not null,
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '' check (char_length(description) <= 1500),
  price_kobo bigint not null check (price_kobo between 10000 and 500000000),
  condition public.market_condition not null default 'good',
  -- a moving-out bundle: several things sold together
  is_bundle boolean not null default false,
  bundle_contents text[] not null default '{}',
  original_value_kobo bigint check (original_value_kobo is null or original_value_kobo > 0),
  status public.market_item_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index market_items_browse_idx on public.market_items (university_id, status, created_at desc);
create index market_items_seller_idx on public.market_items (seller_id);

create table public.market_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.market_items(id) on delete cascade,
  storage_path text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index market_photos_item_idx on public.market_photos (item_id, sort_order);

create table public.market_saved (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.market_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- "Meet on campus" requests: the buyer leaves a message and a way to reach them.
create table public.market_requests (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.market_items(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 600),
  contact text not null check (char_length(contact) between 5 and 80),
  created_at timestamptz not null default now(),
  unique (item_id, buyer_id)
);

-- "Wanted" posts and the offers sellers make on them.
create table public.market_wanted (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id),
  area_id uuid references public.areas(id),
  text text not null check (char_length(text) between 5 and 140),
  max_price_kobo bigint check (max_price_kobo is null or max_price_kobo > 0),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);
create index market_wanted_browse_idx on public.market_wanted (university_id, is_open, created_at desc);

create table public.market_offers (
  id uuid primary key default gen_random_uuid(),
  wanted_id uuid not null references public.market_wanted(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 600),
  contact text not null check (char_length(contact) between 5 and 80),
  created_at timestamptz not null default now(),
  unique (wanted_id, seller_id)
);

-- Public view of items people can buy: no seller contact details.
create or replace view public.market_items_public with (security_invoker = false) as
  select i.id, i.seller_id, i.university_id, i.area_id, i.category, i.title, i.description, i.price_kobo, i.condition,
         i.is_bundle, i.bundle_contents, i.original_value_kobo, i.status, i.created_at,
         a.name as area_name, a.slug as area_slug, u.slug as university_slug,
         coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Student') as seller_name,
         (p.identity_verified_at is not null) as seller_verified,
         (select ph.storage_path from public.market_photos ph where ph.item_id = i.id order by ph.sort_order limit 1) as cover_path
  from public.market_items i
  join public.areas a on a.id = i.area_id
  join public.universities u on u.id = i.university_id
  join public.profiles p on p.id = i.seller_id
  where i.status in ('active', 'reserved') and p.suspended_at is null;
grant select on public.market_items_public to anon, authenticated;

-- Helpers for policies -----------------------------------------------------------
create or replace function public.owns_market_item(p_item uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.market_items where id = p_item and seller_id = auth.uid());
$$;
create or replace function public.owns_market_path(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.market_items
                 where id::text = (storage.foldername(object_name))[1] and seller_id = auth.uid());
$$;
create or replace function public.owns_wanted(p_wanted uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.market_wanted where id = p_wanted and user_id = auth.uid());
$$;

-- Sellers can't change an item's status to/from reserved or sold by hand: escrow does that.
-- The escrow functions below run as the table owner, so a check on current_user lets them through.
create or replace function public.protect_market_item()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.seller_id := old.seller_id;
    if old.status in ('reserved', 'sold') or new.status in ('reserved', 'sold') then
      new.status := old.status;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger market_items_protect before update on public.market_items
  for each row execute function public.protect_market_item();

-- Row-level security -------------------------------------------------------------
alter table public.market_items enable row level security;
create policy "sellers and staff read own items" on public.market_items for select
  using (seller_id = auth.uid() or public.is_admin());
create policy "signed-in users list items" on public.market_items for insert to authenticated
  with check (seller_id = auth.uid() and status = 'active');
create policy "sellers edit own items" on public.market_items for update
  using (seller_id = auth.uid() or public.is_admin());

alter table public.market_photos enable row level security;
create policy "anyone sees photos of live items" on public.market_photos for select using (
  public.owns_market_item(item_id) or exists (select 1 from public.market_items_public v where v.id = item_id));
create policy "sellers add photos" on public.market_photos for insert to authenticated
  with check (public.owns_market_item(item_id));
create policy "sellers remove photos" on public.market_photos for delete
  using (public.owns_market_item(item_id) or public.is_admin());

alter table public.market_saved enable row level security;
create policy "users manage saved items" on public.market_saved for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.market_requests enable row level security;
create policy "buyer and seller read requests" on public.market_requests for select
  using (buyer_id = auth.uid() or public.owns_market_item(item_id) or public.is_admin());
create policy "buyers send requests" on public.market_requests for insert to authenticated
  with check (buyer_id = auth.uid() and not public.owns_market_item(item_id)
              and exists (select 1 from public.market_items_public v where v.id = item_id and v.status = 'active'));

alter table public.market_wanted enable row level security;
create policy "anyone reads open wanted posts" on public.market_wanted for select
  using (is_open or user_id = auth.uid() or public.is_admin());
create policy "users post wanted" on public.market_wanted for insert to authenticated
  with check (user_id = auth.uid());
create policy "users close own wanted" on public.market_wanted for update
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

alter table public.market_offers enable row level security;
create policy "poster and seller read offers" on public.market_offers for select
  using (seller_id = auth.uid() or public.owns_wanted(wanted_id) or public.is_admin());
create policy "sellers make offers" on public.market_offers for insert to authenticated
  with check (seller_id = auth.uid() and not public.owns_wanted(wanted_id));

-- Storage: public photos, sellers upload into a folder named after their item.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('market-photos', 'market-photos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
create policy "sellers upload market photos" on storage.objects for insert to authenticated with check (
  bucket_id = 'market-photos' and public.owns_market_path(name));
create policy "sellers delete market photos" on storage.objects for delete to authenticated using (
  bucket_id = 'market-photos' and (public.owns_market_path(name) or public.is_admin()));

-- Escrow for market items: reuse payments ------------------------------------------
-- A payment is either for a room (listing_id) or for a market item (market_item_id).
alter table public.payments alter column listing_id drop not null;
alter table public.payments add column market_item_id uuid references public.market_items(id);
alter table public.payments add constraint payments_one_target
  check ((listing_id is null) <> (market_item_id is null));
-- only one live escrow per item at a time (the item is reserved for that buyer)
create unique index payments_one_active_item_idx on public.payments (market_item_id)
  where market_item_id is not null and status in ('pending', 'held', 'release_approved', 'disputed');

-- Buyer pays a small protection fee: 3% of the price, at least ₦200 and at most ₦2,000.
create or replace function public.market_fee_kobo(p_price bigint) returns bigint language sql immutable as $$
  select least(greatest(p_price * 3 / 100, 20000), 200000)::bigint
$$;

/** Start (or reuse) an escrow payment for a market item. Price comes from the database. */
create or replace function public.start_market_payment(p_item uuid)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare
  it public.market_items;
  p public.payments;
  fee bigint;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into it from public.market_items where id = p_item for update;
  if not found or it.status not in ('active', 'reserved') then raise exception 'item is not available'; end if;
  if it.seller_id = auth.uid() then raise exception 'you cannot buy your own item'; end if;

  -- abandoned checkouts free the item after 30 minutes
  update public.payments set status = 'cancelled', updated_at = now()
  where market_item_id = p_item and status = 'pending' and created_at < now() - interval '30 minutes';

  select * into p from public.payments where market_item_id = p_item
    and status in ('pending', 'held', 'release_approved', 'disputed');
  if found then
    if p.student_id = auth.uid() then return p; end if;
    raise exception 'item is reserved';
  end if;

  fee := public.market_fee_kobo(it.price_kobo);
  insert into public.payments (market_item_id, student_id, landlord_id, rent_kobo, agent_fee_kobo, caution_fee_kobo,
                               other_fees_kobo, service_fee_kobo, total_kobo)
  values (it.id, auth.uid(), it.seller_id, it.price_kobo, 0, 0, 0, fee, it.price_kobo + fee)
  returning * into p;
  update public.market_items set status = 'reserved', updated_at = now() where id = it.id;
  return p;
end;
$$;

/** Buyer confirms they have the item: release is approved and the item is sold. */
create or replace function public.confirm_item_received(p_payment uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.payments;
begin
  update public.payments set status = 'release_approved', release_approved_at = now(), updated_at = now()
  where id = p_payment and student_id = auth.uid() and status = 'held' and market_item_id is not null
  returning * into p;
  if not found then raise exception 'payment cannot be updated'; end if;
  update public.market_items set status = 'sold', updated_at = now() where id = p.market_item_id;
end;
$$;

-- When an item checkout is cancelled, failed or refunded, put the item back on sale.
create or replace function public.market_release_item()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.market_item_id is not null and new.status in ('cancelled', 'failed', 'refunded')
     and old.status is distinct from new.status then
    update public.market_items set status = 'active', updated_at = now()
    where id = new.market_item_id and status = 'reserved';
  end if;
  return new;
end;
$$;
create trigger payments_market_release after update on public.payments
  for each row execute function public.market_release_item();

grant select, insert, update, delete on public.market_items, public.market_photos, public.market_saved,
  public.market_requests, public.market_wanted, public.market_offers to anon, authenticated;
