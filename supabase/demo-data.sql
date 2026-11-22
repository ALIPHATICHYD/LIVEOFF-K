-- LiveOff-K demo data: one demo landlord and six verified sample rooms near UniAbuja.
-- For testing and showing the flow only. Run once in Supabase SQL Editor, after the migrations and seed.
-- To remove it later: delete from auth.users where email = 'demo-landlord@liveoff-k.test';

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'demo-landlord@liveoff-k.test', '{"provider":"email","providers":["email"]}',
        '{"account_type":"landlord","full_name":"Demo Landlord"}', now(), now());

with landlord as (select id from auth.users where email = 'demo-landlord@liveoff-k.test'),
uni as (select id from public.universities where slug = 'uniabuja'),
rooms (area_slug, title, description, ptype, beds, furnished, rent, agent, caution, facilities, mins, address) as (values
  ('giri', 'Self-contain near Giri junction (sample)', 'Sample listing for the demo. Tiled self-contain with its own kitchen and bathroom, prepaid meter and borehole water.', 'self_contained', 1, false, 450000, 22500, 50000, '{Own bathroom,Kitchen,Prepaid meter,Borehole water}', 5, 'Sample address, Giri'),
  ('giri', 'Furnished single room in Giri (sample)', 'Sample listing for the demo. Bed, wardrobe and reading table included. Shared kitchen, fenced compound.', 'single_room', 1, true, 280000, 14000, 30000, '{Furnished,Fenced compound,Security}', 7, 'Sample address, Giri'),
  ('gwagwalada', 'One-bedroom flat in Gwagwalada town (sample)', 'Sample listing for the demo. Spacious one-bedroom with sitting room, close to the market and buses to campus.', 'one_bedroom', 1, false, 650000, 32500, 75000, '{Kitchen,Own bathroom,Parking,Security}', 10, 'Sample address, Gwagwalada'),
  ('gwako', 'Shared apartment in Gwako (sample)', 'Sample listing for the demo. Your own room in a 3-bedroom flat shared with two UniAbuja students.', 'shared_apartment', 3, true, 300000, 15000, 40000, '{Furnished,Kitchen,Borehole water}', 12, 'Sample address, Gwako'),
  ('iddo', 'Student hostel room in Iddo (sample)', 'Sample listing for the demo. Hostel with security, generator backup and reading room.', 'student_hostel', 1, true, 200000, 0, 20000, '{Furnished,Security,Fenced compound}', 15, 'Sample address, Iddo'),
  ('lugbe', 'Two-bedroom flat in Lugbe (sample)', 'Sample listing for the demo. Good for two students sharing; on the airport road with buses to Gwagwalada.', 'two_bedroom', 2, false, 1200000, 60000, 150000, '{Kitchen,Parking,Prepaid meter,Security}', 35, 'Sample address, Lugbe')
)
insert into public.listings (owner_id, university_id, area_id, title, description, property_type, bedrooms, furnished,
  rent_per_year_kobo, agent_fee_kobo, caution_fee_kobo, facilities, minutes_to_gate, address, status, verified_at)
select landlord.id, uni.id, a.id, r.title, r.description, r.ptype::public.property_type, r.beds, r.furnished,
       r.rent * 100, r.agent * 100, r.caution * 100, r.facilities::text[], r.mins, r.address, 'verified', now()
from rooms r
cross join landlord cross join uni
join public.areas a on a.slug = r.area_slug and a.university_id = uni.id;
