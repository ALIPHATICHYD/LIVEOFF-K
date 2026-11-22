# Running LiveOff-K in production

A short runbook for the first 1,000 users. Each section says what is already built and what you switch on in a dashboard.

## Error tracking

- Every server error is logged as one JSON line. Find them in Vercel → your project → Logs, filter `level":"error`.
- Set `ERROR_WEBHOOK_URL` in Vercel (Settings → Environment Variables) to a Slack or Discord incoming-webhook URL. Server errors and any payment that needs a refund are posted there.
- Pages show a friendly "Something went wrong" screen with an error code. Search that code in the logs.
- Later: swap `src/instrumentation.ts` for Sentry when you want stack traces and user counts.

## Payments and webhooks

- Paystack → Settings → API Keys & Webhooks → Webhook URL: `https://<your-domain>/api/paystack/webhook`.
- The webhook checks Paystack's signature, then records the charge in one locked database function (`record_paystack_charge`). It answers 200 only after the charge is saved, so Paystack retries if the database is down. Retries are safe.
- Every charge we hear about is kept in `payment_events` (staff only).
- Each checkout attempt has its own reference (`LK-…-XXXX`), so a student who closes Paystack can try again.
- Payments that need a person show a red "Check:" line on /admin: paid after the checkout expired and the item was taken (refund in Paystack, then "Mark refunded"), paid twice, or the wrong amount.

## Background jobs

`run_escrow_jobs()` runs every 10 minutes with pg_cron:
- unpaid market checkouts expire after 30 minutes, which frees the item;
- unpaid room checkouts expire after 24 hours;
- 48 hours after "I've moved in" with no dispute, the payment moves to "release approved".

Check it runs: Supabase → Integrations → Cron (or `select * from cron.job_run_details order by start_time desc limit 5;`). If the migration printed "pg_cron not available", enable pg_cron in Database → Extensions and run the pg_cron block of the migration again.

## Rate limits

- Database (built in): per-user caps on support messages (30 per 10 minutes), new support threads, complaints, inspections (10 a day each), listings and market items (20 a day), market requests and offers (30 a day), wanted posts (10 a day). These hold even if someone calls the Supabase API directly. Change a limit by re-creating its trigger, for example:
  `drop trigger market_items_rate_limit on public.market_items; create trigger market_items_rate_limit before insert on public.market_items for each row execute function public.rate_limit('seller_id', '40', '1 day');`
- Sign-in: Supabase → Authentication → Rate Limits. Keep the OTP and anonymous sign-in limits low, and turn on CAPTCHA (Authentication → Attack Protection) before launch.
- Edge: Vercel → Firewall → add a rate-limit rule for `/api/paystack/webhook` and `/login` if you see abuse.

## Spend alerts

- Vercel → Settings → Billing → Spend Management: set a monthly cap and an email alert (Pro plan).
- Supabase → Organization → Billing → Usage: free plan stops at its limits rather than billing; watch database size (500 MB) and egress. On Pro, keep the spend cap on.
- Paystack: turn on email notifications for every successful payment and payout.
- Any SMS provider (Termii) and Resend: set low-balance alerts in their dashboards.

## Rollback

- App: Vercel → Deployments → pick the last good deploy → "Instant Rollback". Takes seconds and does not touch the database.
- Database: migrations only add things. Each migration ends with rollback notes. Never roll back by deleting data.
- Order for a risky release: run the migration first (it is backwards compatible), then deploy the app. If the app breaks, roll back the app only.

## Live database safety

- The SQL editor runs as a superuser and skips every rule in this app. Before running anything that is not a migration: run it inside `begin; … rollback;` first and check the row counts.
- Never run `delete` or `update` without a `where`, and never on `payments`; payments change only through the functions.
- Test new migrations on a second Supabase project (a free "staging" project in the LiveOff-K org) before the live one.
- Keep `NEXT_PUBLIC_DEMO_LOGIN=off` in production and remove the `(sample)` rooms before launch.

## Backups

- GitHub Actions runs `.github/workflows/db-backup.yml` every night at 02:15 Lagos time and keeps 14 days of encrypted dumps (Actions → Database backup → the run → Artifacts).
- Turn it on: repo Settings → Secrets and variables → Actions → add `SUPABASE_DB_URL` (Supabase → Connect → Session pooler string, with your DB password) and `BACKUP_PASSPHRASE`.
- Restore into a new project:
  ```
  gpg -d liveoff-k-db-<stamp>.tgz.gpg | tar xz
  pg_restore --data-only -d "<new project db url>" auth-users.dump   # accounts first
  pg_restore --no-owner -d "<new project db url>" public.dump         # then app tables
  ```
- Test a restore once a month into the staging project. A backup you never restored is a guess.
- Supabase Pro adds daily backups and point-in-time recovery; move to it once real money flows every day.
