-- LiveOff-K demo data for the Student Market: four demo students, sample items, bundles and wanted posts.
-- For testing and showing the flow only. Run once in Supabase SQL Editor, after the migrations and seed.
-- To remove it later: delete from auth.users where email like 'demo-seller-%@liveoff-k.test';

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'demo-seller-' || lower(n) || '@liveoff-k.test', '{"provider":"email","providers":["email"]}',
       jsonb_build_object('account_type', 'student', 'full_name', n || ' (demo)'), now(), now()
from unnest(array['Chiamaka', 'Tolu', 'Aisha', 'Ibrahim']) as n;

with uni as (select id from public.universities where slug = 'uniabuja'),
items (seller, area_slug, cat, cond, title, description, price, bundle, contents, was) as (values
  ('chiamaka', 'giri', 'room', 'good', '6-inch foam mattress (sample)', 'Sample item for the demo. Vitafoam mattress, one session old. No stains, comes with a fitted sheet.', 35000, false, '{}', null),
  ('ibrahim', 'gwagwalada', 'room', 'like_new', 'Reading table and chair (sample)', 'Sample item for the demo. Solid wood table with a drawer and a plastic chair.', 18000, false, '{}', null),
  ('tolu', 'giri', 'kitchen', 'good', '6kg gas cylinder + burner (sample)', 'Sample item for the demo. Cylinder is half full. Burner and hose included, tested last week.', 22000, false, '{}', null),
  ('ibrahim', 'gwako', 'kitchen', 'fair', 'Small table-top fridge (sample)', 'Sample item for the demo. Cools well, small dent on the side.', 65000, false, '{}', null),
  ('aisha', 'iddo', 'power', 'like_new', 'Rechargeable standing fan (sample)', 'Sample item for the demo. Runs about 6 hours on a full charge. Has a USB port and a light.', 28000, false, '{}', null),
  ('tolu', 'giri', 'power', 'good', 'Solar lamp + power bank kit (sample)', 'Sample item for the demo. Small solar panel, two bulbs and a 20,000mAh power bank.', 15000, false, '{}', null),
  ('aisha', 'gwagwalada', 'study', 'good', '100L Law textbooks, set of 5 (sample)', 'Sample item for the demo. Constitutional law, legal methods and more. Some highlighting.', 12000, false, '{}', null),
  ('chiamaka', 'giri', 'study', 'like_new', 'Casio fx-991ES calculator (sample)', 'Sample item for the demo. Works perfectly, with the cover.', 9000, false, '{}', null),
  ('ibrahim', 'lugbe', 'gadgets', 'good', 'HP laptop, 8GB RAM (sample)', 'Sample item for the demo. Core i5, 256GB SSD. Battery lasts about 3 hours. Charger included.', 180000, false, '{}', null),
  ('tolu', 'gwako', 'other', 'fair', 'Bicycle with lock (sample)', 'Sample item for the demo. Gets you to the gate in 10 minutes. New brake pads.', 45000, false, '{}', null),
  ('chiamaka', 'giri', 'room', 'good', 'Full self-contain setup, Giri (sample)', 'Sample bundle for the demo. Leaving in December, everything goes together.', 85000, true, '{Mattress,Reading table,Gas cylinder,Standing fan,Curtains}', 112000),
  ('aisha', 'gwagwalada', 'kitchen', 'good', 'Kitchen starter pack (sample)', 'Sample bundle for the demo. Everything you need to cook from day one.', 30000, true, '{Gas cylinder,Burner,2 pots,Kettle}', 41000),
  ('ibrahim', 'iddo', 'study', 'like_new', 'Study corner (sample)', 'Sample bundle for the demo.', 26000, true, '{Table,Chair,Reading lamp,200L books}', 34000)
)
insert into public.market_items (seller_id, university_id, area_id, category, condition, title, description, price_kobo,
  is_bundle, bundle_contents, original_value_kobo)
select u.id, uni.id, a.id, i.cat::public.market_category, i.cond::public.market_condition, i.title, i.description, i.price * 100,
       i.bundle, i.contents::text[], i.was * 100
from items i
cross join uni
join auth.users u on u.email = 'demo-seller-' || i.seller || '@liveoff-k.test'
join public.areas a on a.slug = i.area_slug and a.university_id = uni.id;

insert into public.market_wanted (user_id, university_id, area_id, text, max_price_kobo)
select u.id, uni.id, a.id, w.text, w.max * 100
from (values ('tolu', 'giri', 'Need a reading table under ₦15k (sample)', 15000),
             ('aisha', 'gwagwalada', 'Looking for 200L Accounting textbooks (sample)', null),
             ('chiamaka', 'iddo', 'Want a rechargeable lamp (sample)', 8000)) as w (seller, area_slug, text, max)
cross join (select id from public.universities where slug = 'uniabuja') uni
join auth.users u on u.email = 'demo-seller-' || w.seller || '@liveoff-k.test'
join public.areas a on a.slug = w.area_slug and a.university_id = uni.id;
