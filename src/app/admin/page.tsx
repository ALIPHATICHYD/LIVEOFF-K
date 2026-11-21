import { Suspense } from "react";
import { PageLoading } from "@/components/PageLoading";
import type { Metadata } from "next";
import { SetupNotice } from "@/components/SetupNotice";
import { requireRole } from "@/lib/auth";
import { STATUS_LABEL, VERIFICATION_CHECKS, formatNaira } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { reviewListing, suspendListing, updateComplaint } from "./actions";

export const metadata: Metadata = { title: "Admin" };

async function AdminPageContent() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  await requireRole(["admin"], "/admin");
  const supabase = await createClient();
  const count = (table: string) => supabase.from(table).select("id", { count: "exact", head: true });

  const [users, students, landlords, verified, inspections, openComplaints, queueRes, complaintsRes] = await Promise.all([
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
  ]);

  const queue = queueRes.data ?? [];
  const docPaths = queue.flatMap((l) => l.listing_documents.map((d) => d.storage_path));
  const { data: signed } = docPaths.length
    ? await supabase.storage.from("listing-documents").createSignedUrls(docPaths, 600)
    : { data: [] };
  const signedUrl = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const metrics = [
    ["Registered users", users.count], ["Students", students.count], ["Landlords and agents", landlords.count],
    ["Verified properties", verified.count], ["Inspections booked", inspections.count], ["Open complaints", openComplaints.count],
  ] as const;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-16 pt-8">
      <h1 className="font-display text-3xl font-bold">Admin</h1>
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map(([label, value]) => (
          <div key={label} className="card flex flex-col gap-1.5 p-4">
            <span className="text-[13px] text-muted">{label}</span>
            <span className="font-display text-3xl font-bold">{value ?? 0}</span>
          </div>
        ))}
      </div>
      {/* TODO: revenue, refunds and completed rentals once payments are added (plan section 7.7) */}

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
                : <span className="text-[#a1281a]">none uploaded</span>}
            </p>
            <fieldset className="grid gap-2 sm:grid-cols-2">
              {VERIFICATION_CHECKS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm"><input type="checkbox" name={`check_${c.key}`} className="size-4 accent-brand" />{c.label}</label>
              ))}
            </fieldset>
            <div className="flex flex-wrap justify-end gap-2">
              <button name="decision" value="inspect" className="btn-ghost h-9 text-sm">Mark inspection scheduled</button>
              <button name="decision" value="reject" className="btn h-9 border border-[#e5b4ac] bg-white text-sm text-[#a1281a]">Reject</button>
              <button name="decision" value="approve" className="btn-primary h-9 text-sm">Approve if all checks pass</button>
            </div>
          </form>
        ))}
        {!queue.length && <p className="p-5 text-muted">Nothing waiting.</p>}
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-bold">Open complaints and suspicious listings</h2>
        {(complaintsRes.data ?? []).map((c) => (
          <div key={c.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 ${c.is_suspicious_listing ? "border-[#f0d9a0] bg-[#fffbf0]" : "border-line"}`}>
            <div className="min-w-0">
              <p className="font-semibold">{c.subject}</p>
              <p className="text-sm text-muted">{c.details}</p>
            </div>
            <div className="flex gap-2">
              <form action={updateComplaint}><input type="hidden" name="id" value={c.id} /><button name="status" value="investigating" className="btn-ghost h-9 text-sm">Investigate</button></form>
              <form action={updateComplaint}><input type="hidden" name="id" value={c.id} /><button name="status" value="resolved" className="btn-ghost h-9 text-sm">Resolve</button></form>
              {c.listing_id && <form action={suspendListing}><input type="hidden" name="listingId" value={c.listing_id} /><button className="btn h-9 border border-[#e5b4ac] bg-white text-sm text-[#a1281a]">Suspend listing</button></form>}
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
