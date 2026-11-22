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
| Payments | Paystack + escrow tables in Postgres | Students pay into LiveOff-K escrow; staff release to the landlord after move-in. Run this through a licensed escrow/payment partner with legal sign-off before going live. |

## Run it locally

1. Create a Supabase project (free tier is fine).
2. In the Supabase SQL editor, run every file in `supabase/migrations/` in name order, then `supabase/seed.sql`.
   With the Supabase CLI you can instead run `npx supabase link` and `npx supabase db push`.
3. In Supabase, go to Authentication -> Sign In / Providers -> Phone, and enable it with an SMS provider (Twilio, MessageBird, Vonage or Textlocal; Termii needs a custom SMS hook). For testing, add a test phone number and fixed code there.
4. `cp .env.example .env.local` and fill in the values (Supabase: Project Settings -> API; Paystack: Settings -> API Keys & Webhooks). On Vercel, add the same values under Project -> Settings -> Environment Variables.
   In Paystack, set the webhook URL to `https://<your-site>/api/paystack/webhook`.
5. `npm install` then `npm run dev`, and open http://localhost:3000.

To make yourself an admin, sign in once, then run in the SQL editor:

```sql
update public.profiles set role = 'admin' where phone = '234XXXXXXXXXX';
```

## Running it in production

Error alerts, webhooks, background jobs, rate limits, spend alerts, rollback, backups: see [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Let people try it (demo mode)

Real log-in texts a code, which needs an SMS provider in Supabase (Auth → Sign In / Providers → Phone, e.g. Twilio or Termii). Until that is set up, testers can use the demo sign-in:

1. Supabase → Authentication → Sign In / Providers → turn on **Allow anonymous sign-ins**.
2. Supabase → SQL Editor: run `supabase/demo-data.sql` once. It adds a demo landlord and six verified sample rooms (titles end in "(sample)").
3. For the Student Market, also run `supabase/demo-market.sql` once: four demo student sellers, ten sample items, three moving-out bundles and three wanted posts.
4. On `/login`, testers pick Student, Landlord or Agent and tap **Try the demo**. They get a temporary account with no phone number.

Before launch: turn anonymous sign-ins off, set `NEXT_PUBLIC_DEMO_LOGIN=off` in Vercel to hide the button, and remove the sample rooms with
`delete from auth.users where email = 'demo-landlord@liveoff-k.test';` and the sample market items with
`delete from auth.users where email like 'demo-seller-%@liveoff-k.test';`

## How the main flows work

- **Onboarding**: `/` asks for the university, `/start/[uni]` shows its nearby areas on a mini map plus a budget. The choice is kept in a cookie, so it works before login.
- **Escrow**: after booking an inspection, the student pays into escrow (Paystack). Status goes `held` -> `moved_in` (48 hours to report a problem) -> `release_approved` -> `released` once staff record the payout. The student can open a dispute at any point before release, which freezes the money and opens a support chat. Amounts always come from the database, and a payment is only marked paid after Paystack confirms the exact amount (webhook or return-page verification).
- **Student Market**: `/market` lets students buy and sell used items (room setup, kitchen, power, books, gadgets), moving-out bundles, and post "wanted" requests that sellers answer with offers. Sellers list at `/market/sell`, then add photos; `/market/mine` shows their items, buyer messages and offers. A buyer either pays through the same escrow as rent (`start_market_payment`, price from the database plus a 3% buyer protection fee, min ₦200, max ₦2,000) or sends a "meet on campus" message with their phone number, which only the seller can read. Paying reserves the item (an unpaid checkout frees it after 30 minutes). Status goes `held` -> `release_approved` when the buyer taps "I've got the item" (the item becomes sold) -> `released` once staff pay the seller. A dispute or refund works exactly like rent; a refund or cancelled checkout puts the item back on sale.
- **Support**: `/support` has instant answers to common questions and a chat with staff. Staff reply from `/admin`.


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
src/app/(onboarding) welcome (pick university) and start/[uni] (areas + budget)
src/app/(app)        rooms, room page, saved, payments, support, login, upload, admin
src/app/api          Paystack webhook
src/components/     header, footer, logo, listing card
src/lib/            supabase clients, auth helpers, formatting, image compression
src/proxy.ts        refreshes the session cookie and guards /upload and /admin
supabase/           SQL migration and seed data
```

## Next steps

- Automatic payouts to landlords (Paystack Transfers) instead of staff recording them.
- Report-a-listing form (the `complaints` table and admin view already exist).
- Online tenant application and agreement (plan section 7.3).
- Email (Resend) and WhatsApp/SMS inspection reminders.
- Marketplace for furniture and electronics (phase 2).
