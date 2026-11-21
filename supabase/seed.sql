-- Pilot campus and nearby areas. Adding a campus later = more rows like these.
insert into public.universities (slug, name, short_name, city, state, is_live)
values ('uniabuja', 'University of Abuja', 'UniAbuja', 'Gwagwalada', 'FCT', true)
on conflict (slug) do nothing;

insert into public.areas (university_id, slug, name)
select u.id, a.slug, a.name
from public.universities u,
     (values ('dagiri', 'Dagiri'), ('giri', 'Giri'), ('angwan-dodo', 'Angwan Dodo'),
             ('phase-3', 'Phase 3'), ('passo', 'Passo'), ('kutunku', 'Kutunku'),
             ('gwagwalada-town', 'Gwagwalada town')) as a(slug, name)
where u.slug = 'uniabuja'
on conflict (university_id, slug) do nothing;
