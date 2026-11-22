import { Suspense } from "react";
import { PageLoading } from "@/components/PageLoading";
import type { Metadata } from "next";
import { SetupNotice } from "@/components/SetupNotice";
import { requireRole } from "@/lib/auth";
import { PAYMENT_STATUS, STATUS_LABEL, VERIFICATION_CHECKS, formatNaira } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { markRefunded, markReleased, reviewListing, suspendListing, updateComplaint } from "./actions";

export const metadata: Metadata = { title: "Admin" };

const isPast = (iso: string | null) => !!iso && new Date(iso).getTime() < Date.now();

async function AdminPageContent() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  await requireRole(["admin"], "/admin");
  const supabase = await createClient();
  const count = (table: string) => supabase.from(table).select("id", { count: "exact", head: true });

  const [users, students, landlords, verified, inspections, openComplaints, queueRes, complaintsRes, escrowRes, threadsRes] = await Promise.all([
    count("profiles"),
    count("profiles").eq("role", "student"),
    count("profiles").in("role", ["landlord", "agent"]),
    count("listings").eq("status", "verified"),
    count("inspections"),
    count("complaints").in("status", ["open", "investigating"]),
    supabase.from("listings")
      .select("id, title, status, rent_per_year_kobo, address, created_at, areas(name), listing_documents(kind, storage_path), listing_photos(id)")
      .in("status", ["pending_review", "inspection_scheduled"]).order("created_at"),
    supabase.from("complaints").select("id, subject, details, status, is_suspicious_listing, listing_id, created_at")
      .in("status", ["open", "investigating"]).order("created_at", { ascending: false }).limit(20),
    supabase.from("payments").select("id, reference, status, total_kobo, release_due_at, dispute_reason, needs_refund_at, review_note, listings(title), market_items(title)")
      .or("status.in.(held,moved_in,release_approved,disputed),and(status.eq.cancelled,needs_refund_at.not.is.null)").order("created_at"),
    supabase.from("support_threads").select("id, subject, status, updated_at").in("status", ["open"]).order("updated_at").limit(30),
  ]);
  const escrow = escrowRes.data ?? [];
  const heldKobo = escrow.reduce((sum, p) => sum + Number(p.total_kobo), 0);

  const queue = queueRes.data ?? [];
  const docPaths = queue.flatMap((l) => l.listing_documents.map((d) => d.storage_path));
  const { data: signed } = docPaths.length
    ? await supabase.storage.from("listing-documents").createSignedUrls(docPaths, 600)
    : { data: [] };
  const signedUrl = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const metrics = [
    ["Registered users", users.count], ["Students", students.count], ["Landlords and agents", landlords.count],
    ["Verified properties", verified.count], ["Inspections booked", inspections.count], ["Open complaints", openComplaints.count],
    ["Money in escrow", formatNaira(heldKobo)], ["Open support chats", threadsRes.data?.length ?? 0],
  ] as const;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 pb-16 pt-8 lg:px-10">
      <h1 className="font-display text-3xl font-bold">Admin</h1>
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="card flex flex-col gap-1.5 p-4">
            <span className="text-[13px] text-muted">{label}</span>
            <span className="font-display text-2xl font-bold">{value ?? 0}</span>
          </div>
        ))}
      </div>

      <section className="card overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 text-lg font-bold">Escrow ({escrow.length})</h2>
        {escrow.map((p) => {
          const title = (p.listings as unknown as { title: string } | null)?.title ?? (p.market_items as unknown as { title: string } | null)?.title ?? "Room";
          const due = p.status === "moved_in" && isPast(p.release_due_at);
          const releasable = p.status === "release_approved" || due;
          return (
            <div key={p.id} className="flex flex-col gap-2 border-b border-line p-5 last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <a href={`/payments/${p.id}`} className="font-bold text-brand">{title}</a>
                <span className="text-sm text-muted">{formatNaira(Number(p.total_kobo))} · {PAYMENT_STATUS[p.status]?.label}{due && " · 48h passed"} · {p.reference}</span>
              </div>
              {p.dispute_reason && <p className="text-sm text-danger">Dispute: {p.dispute_reason}</p>}
              {p.review_note && <p className="text-sm text-danger">Check: {p.review_note}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                {releasable && (
                  <form action={markReleased} className="flex gap-2">
                    <input type="hidden" name="paymentId" value={p.id} />
                    <input name="payoutReference" required placeholder="Bank/Paystack transfer ref" className="field h-9 w-56 text-sm" />
                    <button className="btn-primary h-9 text-sm">Mark paid to landlord</button>
                  </form>
                )}
                {(["held", "moved_in", "disputed"].includes(p.status) || (p.status === "cancelled" && p.needs_refund_at)) && (
                  <form action={markRefunded}><input type="hidden" name="paymentId" value={p.id} />
                    <button className="btn h-9 border border-danger-line bg-white text-sm text-danger">Mark refunded</button></form>
                )}
              </div>
            </div>
          );
        })}
        {!escrow.length && <p className="p-5 text-muted">No money in escrow.</p>}
      </section>

      <section className="card flex flex-col gap-2 p-5">
        <h2 className="text-lg font-bold">Support chats waiting for a reply</h2>
        {(threadsRes.data ?? []).map((t) => (
          <Link key={t.id} href={`/support/${t.id}`} className="flex justify-between rounded-xl border border-line p-3 text-ink hover:border-brand">
            <span className="font-semibold">{t.subject}</span>
            <span className="text-sm text-muted">{new Date(t.updated_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })}</span>
          </Link>
        ))}
        {!threadsRes.data?.length && <p className="text-muted">All caught up.</p>}
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 text-lg font-bold">Listings waiting for verification ({queue.length})</h2>
        {queue.map((l) => (
          <form key={l.id} action={reviewListing} className="flex flex-col gap-3 border-b border-line p-5 last:border-0">
            <input type="hidden" name="listingId" value={l.id} />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <a href={`/upload/${l.id}`} className="font-bold text-brand">{l.title}</a>
              <span className="text-sm text-muted">
                {(l.areas as unknown as { name: string } | null)?.name} · {formatNaira(l.rent_per_year_kobo)} · {l.listing_photos.length} photos · {STATUS_LABEL[l.status]}
              </span>
            </div>
            <p className="text-sm">Address: {l.address}</p>
            <p className="text-sm">
              Documents:{" "}
              {l.listing_documents.length
                ? l.listing_documents.map((d) => <a key={d.storage_path} href={signedUrl.get(d.storage_path) ?? undefined} target="_blank" rel="noreferrer" className="mr-3 font-semibold text-brand">{d.kind.replace("_", " ")}</a>)
                : <span className="text-danger">none uploaded</span>}
            </p>
            <fieldset className="grid gap-2 sm:grid-cols-2">
              {VERIFICATION_CHECKS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm"><input type="checkbox" name={`check_${c.key}`} className="size-4 accent-brand" />{c.label}</label>
              ))}
            </fieldset>
            <div className="flex flex-wrap justify-end gap-2">
              <button name="decision" value="inspect" className="btn-ghost h-9 text-sm">Mark inspection scheduled</button>
              <button name="decision" value="reject" className="btn h-9 border border-danger-line bg-white text-sm text-danger">Reject</button>
              <button name="decision" value="approve" className="btn-primary h-9 text-sm">Approve if all checks pass</button>
            </div>
          </form>
        ))}
        {!queue.length && <p className="p-5 text-muted">Nothing waiting.</p>}
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-bold">Open complaints and suspicious listings</h2>
        {(complaintsRes.data ?? []).map((c) => (
          <div key={c.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 ${c.is_suspicious_listing ? "border-amber-line bg-amber-soft/50" : "border-line"}`}>
            <div className="min-w-0">
              <p className="font-semibold">{c.subject}</p>
              <p className="text-sm text-muted">{c.details}</p>
            </div>
            <div className="flex gap-2">
              <form action={updateComplaint}><input type="hidden" name="id" value={c.id} /><button name="status" value="investigating" className="btn-ghost h-9 text-sm">Investigate</button></form>
              <form action={updateComplaint}><input type="hidden" name="id" value={c.id} /><button name="status" value="resolved" className="btn-ghost h-9 text-sm">Resolve</button></form>
              {c.listing_id && <form action={suspendListing}><input type="hidden" name="listingId" value={c.listing_id} /><button className="btn h-9 border border-danger-line bg-white text-sm text-danger">Suspend listing</button></form>}
            </div>
          </div>
        ))}
        {!complaintsRes.data?.length && <p className="text-muted">No open complaints.</p>}
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminPageContent  />
    </Suspense>
  );
}
