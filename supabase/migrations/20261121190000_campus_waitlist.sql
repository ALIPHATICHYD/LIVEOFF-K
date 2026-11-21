-- Students at campuses that are not live yet can leave a phone number to hear when LiveOff-K opens there.
create table public.campus_waitlist (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  phone text not null check (phone ~ '^\+234[789][01][0-9]{8}$'),
  created_at timestamptz not null default now(),
  unique (university_id, phone)
);

alter table public.campus_waitlist enable row level security;

-- Anyone may join the waitlist for a campus that is not live. Nobody but admins can read it.
create policy "join waitlist for upcoming campus" on public.campus_waitlist
  for insert to anon, authenticated
  with check (exists (select 1 from public.universities u where u.id = university_id and not u.is_live));

create policy "admins read waitlist" on public.campus_waitlist
  for select to authenticated using (public.is_admin());

grant insert on public.campus_waitlist to anon, authenticated;
grant select on public.campus_waitlist to authenticated;
