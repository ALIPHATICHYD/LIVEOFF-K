-- Campuses. Only UniAbuja is live; the others show as "coming soon".
insert into public.universities (slug, name, short_name, city, state, is_live) values
  ('uniabuja', 'University of Abuja', 'UniAbuja', 'Gwagwalada', 'FCT', true),
  ('baze', 'Baze University', 'Baze', 'Jabi', 'FCT', false),
  ('nile', 'Nile University', 'Nile', 'Jabi', 'FCT', false),
  ('veritas', 'Veritas University', 'Veritas', 'Bwari', 'FCT', false)
on conflict (slug) do update set name = excluded.name, is_live = excluded.is_live;

-- Areas students from UniAbuja live in. Travel times are rough estimates: confirm on the ground.
insert into public.areas (university_id, slug, name, minutes_to_campus, map_x, map_y, sort_order)
select u.id, a.slug, a.name, a.mins, a.x, a.y, a.ord
from public.universities u,
     (values ('giri', 'Giri', 5, 58, 56, 1),
             ('gwagwalada', 'Gwagwalada', 10, 12, 34, 2),
             ('gwako', 'Gwako', 12, 60, 78, 3),
             ('iddo', 'Iddo', 15, 6, 72, 4),
             ('lugbe', 'Lugbe', 35, 64, 8, 5)) as a(slug, name, mins, x, y, ord)
where u.slug = 'uniabuja'
on conflict (university_id, slug) do update
  set name = excluded.name, minutes_to_campus = excluded.minutes_to_campus,
      map_x = excluded.map_x, map_y = excluded.map_y, sort_order = excluded.sort_order;
