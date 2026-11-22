import Link from "next/link";
import { SkyBand } from "@/components/welcome/SkyBand";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icons";
import { PageLoading } from "@/components/PageLoading";
import { SetupNotice } from "@/components/SetupNotice";
import { requireRole } from "@/lib/auth";
import { PAYMENT_STATUS, formatNaira } from "@/lib/format";
import { isPaystackConfigured, recordCharge, verifyTransaction } from "@/lib/paystack";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { approveRelease, confirmItemReceived, confirmMovedIn, openDispute } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };

const STEPS = [
  { key: "held", title: "Paid into escrow", sub: "LiveOff-K holds your money, not the landlord" },
  { key: "moved_in", title: "Moved in", sub: "You have 48 hours to report a problem" },
  { key: "release_approved", title: "You confirmed", sub: "We pay the landlord" },
  { key: "released", title: "Released to landlord", sub: "All done. Enjoy your new room" },
];
const ORDER = ["pending", "held", "moved_in", "release_approved", "released"];
const ITEM_STEPS = [
  { key: "held", title: "Paid into escrow", sub: "LiveOff-K holds your money, not the seller" },
  { key: "release_approved", title: "You got the item", sub: "Meet the seller, check it works, then confirm" },
  { key: "released", title: "Released to seller", sub: "All done. Enjoy it" },
];
const ITEM_ORDER = ["pending", "held", "release_approved", "released"];

async function Content({ params, searchParams }: Props) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const profile = await requireRole(["student", "landlord", "agent", "admin"], `/payments/${id}`);
  const supabase = await createClient();
  const load = () => supabase.from("payments")
    .select("*, listings(title, area_id), market_items(title)").eq("id", id).maybeSingle();
  let { data: p } = await load();
  if (!p) notFound();

  // Returning from Paystack: confirm with Paystack directly (never trust the URL alone).
  // Each checkout attempt uses "<payment reference>-<suffix>"; a late payment on an expired checkout still counts.
  const ref = sp.reference ?? sp.trxref;
  if (ref && (ref === p.reference || ref.startsWith(`${p.reference}-`)) && ["pending", "cancelled"].includes(p.status) && isPaystackConfigured()) {
    const result = await verifyTransaction(ref);
    if (result) {
      try {
        await recordCharge(ref, result, "return");
        ({ data: p } = await load());
      } catch (err) {
        console.error(JSON.stringify({ level: "error", msg: "return page could not record charge", reference: ref, error: String(err) }));
      }
    }
  }
  if (!p) notFound();

  const isStudent = p.student_id === profile.id;
  const s = PAYMENT_STATUS[p.status] ?? PAYMENT_STATUS.pending;
  const isItem = !!p.market_item_id;
  const steps = isItem ? ITEM_STEPS : STEPS;
  const idx = (isItem ? ITEM_ORDER : ORDER).indexOf(p.status);
  const title = (p.listings as { title: string } | null)?.title ?? (p.market_items as { title: string } | null)?.title ?? "Room";
  const due = p.release_due_at ? new Date(p.release_due_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }) : null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-6 lg:py-10">
      <Link href="/payments" className="text-sm font-semibold text-brand">← All payments</Link>
      <h1 className="font-display text-3xl font-bold">Your payment</h1>

      <section className="relative overflow-hidden rounded-[20px] bg-brand p-5 pb-12 text-white">
        <SkyBand className="h-12" opacity="opacity-50" />
        <div className="relative"><p className="text-[13px] text-on-brand">{title}</p>
        <p className="mt-1 font-display text-[32px] font-bold">{formatNaira(Number(p.total_kobo))}</p>
        <span key={p.status} className={`mt-2 inline-block origin-left rounded-full px-2.5 py-1 text-xs font-bold text-ink ${["held", "released"].includes(p.status) ? "lk-pop " : ""}${p.status === "released" ? "bg-mint" : p.status === "disputed" ? "bg-danger-soft text-danger" : "bg-amber"}`}>{s.label}</span></div>
        <Icon name="shield" size={150} strokeWidth={1} className="absolute -bottom-10 -right-8 opacity-10" />
      </section>

      {sp.setup && (
        <p className="rounded-xl bg-amber-soft p-3 text-sm text-amber-ink">Online payments aren&apos;t switched on yet. Add the Paystack keys to the site settings (see the README).</p>
      )}
      {p.needs_refund_at && p.status === "cancelled" && (
        <p role="status" className="rounded-xl bg-amber-soft p-3 text-sm text-amber-ink">Your payment arrived after this checkout had expired and someone else had already reserved it. We&apos;re refunding you in full. Message support if you have questions.</p>
      )}
      {sp.error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">That didn&apos;t work. Try again or message support.</p>}

      {p.status === "disputed" || p.status === "refunded" ? (
        <section className="card p-5">
          <p className="font-bold">{p.status === "disputed" ? "Your money is on hold while we sort this out." : "This payment was refunded."}</p>
          {p.dispute_reason && <p className="mt-1 text-sm text-muted">“{p.dispute_reason}”</p>}
          <Link href="/support" className="btn-primary mt-3 h-11">Go to support</Link>
        </section>
      ) : (
        <section className="card flex flex-col p-5">
          {steps.map((step, k) => {
            const n = k + 1;
            const done = idx >= n;
            const now = !done && idx === k; // the next step to happen
            return (
              <div key={step.key} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <span className={`flex size-7 items-center justify-center rounded-full border-2 text-[13px] font-bold ${done ? "border-brand bg-brand text-white" : now ? "lk-pulse border-amber bg-amber text-ink" : "border-field bg-white text-muted"}`}>
                    {done ? <Icon name="check" size={14} strokeWidth={3} /> : n}
                  </span>
                  {n < steps.length && <span className={`min-h-6 w-0.5 flex-1 ${done ? "bg-brand" : "bg-line"}`} />}
                </div>
                <div className="pb-4">
                  <p className={`mt-0.5 font-bold ${done || now ? "text-ink" : "text-faint"}`}>{step.title}</p>
                  <p className="text-[13px] text-muted">{step.key === "moved_in" && due && p.status === "moved_in" ? `Report any problem before ${due}` : step.sub}</p>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {isStudent && p.status === "pending" && (
        <Link href={isItem ? `/market/${p.market_item_id}` : `/listings/${p.listing_id}`} className="btn-primary h-13 rounded-[14px] text-base">Finish paying</Link>
      )}
      {isStudent && isItem && p.status === "held" && (
        <form action={confirmItemReceived}><input type="hidden" name="paymentId" value={p.id} />
          <button className="btn-primary h-13 w-full rounded-[14px] text-base">I&apos;ve got the item, release payment</button></form>
      )}
      {isStudent && !isItem && p.status === "held" && (
        <form action={confirmMovedIn}><input type="hidden" name="paymentId" value={p.id} />
          <button className="btn-primary h-13 w-full rounded-[14px] text-base">I&apos;ve moved in</button></form>
      )}
      {isStudent && p.status === "moved_in" && (
        <form action={approveRelease}><input type="hidden" name="paymentId" value={p.id} />
          <button className="btn-primary h-13 w-full rounded-[14px] text-base">Everything is fine, release payment</button></form>
      )}
      {isStudent && ["held", "moved_in"].includes(p.status) && (
        <details className="card p-4">
          <summary className="cursor-pointer list-none font-bold text-danger">Something&apos;s wrong? Hold payment and open a dispute</summary>
          <form action={openDispute} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="paymentId" value={p.id} />
            <label className="flex flex-col gap-1.5 text-sm font-semibold">What happened?
              <textarea name="reason" required rows={3} maxLength={1000} className="rounded-[10px] border border-field p-3 font-medium" placeholder={isItem ? "e.g. The seller didn't show up, or the item doesn't work" : "e.g. The room has no water and the landlord isn't responding"} />
            </label>
            <button className="btn h-11 border border-danger-line bg-white text-danger">Hold my money and talk to support</button>
          </form>
        </details>
      )}
      <p className="text-center text-xs text-muted">Escrow held by [licensed escrow partner]. Reference {p.reference}</p>
    </div>
  );
}

export default function PaymentPage(props: Props) {
  return <Suspense fallback={<PageLoading />}><Content {...props} /></Suspense>;
}
