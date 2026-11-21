# LiveOff-K

Find. Rent. Live. Better. Verified student housing, piloting at the University of Abuja.

## Stack

| Part | Choice | Why |
| --- | --- | --- |
| App | Next.js 16 (App Router, TypeScript, Tailwind v4) | One codebase for the student site, landlord upload and admin. Server rendering is fast on phones and good for search. |
| Data | Supabase Postgres | `university -> area -> listing`, so a new campus is new rows, not new code. |
| Logins | Supabase Auth, phone OTP | Students and landlords sign in with a text code. Roles: student, landlord, agent, admin. |
| Images | Supabase Storage | Photos are resized to WebP (max 1600px) in the browser before upload. Ownership documents go to a private bucket. |
| Search | Postgres full-text search | Enough for the pilot. Move to Meilisearch/Typesense past ~10 campuses. |
| Payments | Not built yet | Paystack or Flutterwave. No holding of funds or escrow until legal sign-off. |

## Run it locally

1. Create a Supabase project (free tier is fine).
2. In the Supabase SQL editor, run `supabase/migrations/20261121000000_init.sql`, then `supabase/seed.sql`.
   With the Supabase CLI you can instead run `npx supabase link` and `npx supabase db push`.
3. In Supabase, go to Authentication -> Sign In / Providers -> Phone, and enable it with an SMS provider (Twilio, MessageBird, Vonage or Textlocal; Termii needs a custom SMS hook). For testing, add a test phone number and fixed code there.
4. `cp .env.example .env.local` and fill in the project URL and publishable key (Project Settings -> API).
5. `npm install` then `npm run dev`, and open http://localhost:3000.

To make yourself an admin, sign in once, then run in the SQL editor:

```sql
update public.profiles set role = 'admin' where phone = '234XXXXXXXXXX';
```

## How the main flows work

- **Students** browse `/listings` (verified listings only, through the `listings_public` view, which hides the address), open a listing and book a free inspection.
- **Landlords and agents** sign up choosing their account type, add a listing at `/upload`, upload photos and proof of authority, then request review. Listings start as drafts.
- **Admins** review at `/admin`: they open the private documents, tick the six verification checks from section 9 of the business plan, and approve. A listing goes live only when every check passes. Editing the price or address of a live listing sends it back for review.

## Security model

All rules live in the database (row-level security and triggers), not only in the app:

- Users cannot change their own role, verification or suspension.
- Owners cannot mark their own listing verified or featured. Featured never means verified.
- Students can only book inspections on verified listings; landlords see inspections for their own listings only.
- Ownership documents are readable only by the uploader and admins (signed URLs, 10 minutes).

## Project layout

```
src/app/            pages: home, listings, listings/[id], login, upload, upload/[id], admin
src/components/     header, footer, logo, listing card
src/lib/            supabase clients, auth helpers, formatting, image compression
src/proxy.ts        refreshes the session cookie and guards /upload and /admin
supabase/           SQL migration and seed data
```

## Next steps

- Payments (Paystack/Flutterwave) and the revenue, refund and completed-rental numbers in the admin dashboard.
- Report-a-listing form (the `complaints` table and admin view already exist).
- Online tenant application and agreement (plan section 7.3).
- Email (Resend) and WhatsApp/SMS inspection reminders.
- Marketplace for furniture and electronics (phase 2).
