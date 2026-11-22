import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icons";
import { PageLoading } from "@/components/PageLoading";
import { SaveButton } from "@/components/SaveButton";
import { SetupNotice } from "@/components/SetupNotice";
import { getProfile } from "@/lib/auth";
import { PROPERTY_TYPES, areaTint, formatNaira } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { PublicListing } from "@/lib/types";
import { BookInspection } from "./BookInspection";
import { Gallery } from "./Gallery";
import { PayForm } from "./PayForm";

type Props = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;
const SERVICE_FEE_KOBO = 500_000; // keep in sync with public.service_fee_kobo()

async function load(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: listing } = await supabase.from("listings_public").select("*").eq("id", id).maybeSingle();
  if (!listing) return null;
  const [{ data: photos }, { data: checks }] = await Promise.all([
    supabase.from("listing_photos").select("storage_path, caption").eq("listing_id", id).order("sort_order"),
    supabase.from("verification_checks").select("label, passed, checked_at").eq("listing_id", id).eq("passed", true),
  ]);
  return { supabase, listing: listing as PublicListing, photos: photos ?? [], checks: checks ?? [] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isSupabaseConfigured) return {};
  const data = await load((await params).id);
  return data ? { title: data.listing.title } : {};
}

async function Content({ params }: Props) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const data = await load((await params).id);
  if (!data) notFound();
  const { supabase, listing: l, photos, checks } = data;
  const profile = await getProfile();

  let saved = false;
  let inspection: { requested_for: string; status: string } | null = null;
  let payment: { id: string; status: string } | null = null;
  let email: string | null = null;
  if (profile) {
    const [s, i, p, e] = await Promise.all([
      supabase.from("saved_listings").select("listing_id").eq("listing_id", l.id).maybeSingle(),
      supabase.from("inspections").select("requested_for, status").eq("listing_id", l.id).eq("student_id", profile.id)
        .in("status", ["requested", "confirmed", "completed"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("payments").select("id, status").eq("listing_id", l.id).eq("student_id", profile.id)
        .not("status", "in", "(failed,cancelled,refunded)").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("profiles").select("email").eq("id", profile.id).maybeSingle(),
    ]);
    saved = !!s.data; inspection = i.data; payment = p.data; email = e.data?.email ?? null;
  }

  const fees = [
    { label: `Rent (${l.min_rental_months} months)`, kobo: l.rent_per_year_kobo },
    { label: "Agent fee", kobo: l.agent_fee_kobo },
    { label: "Caution fee (refundable)", kobo: l.caution_fee_kobo },
    { label: l.other_fees_note || "Other fees", kobo: l.other_fees_kobo },
    { label: "LiveOff-K service fee", kobo: SERVICE_FEE_KOBO },
  ].filter((f) => f.kobo > 0);
  const total = fees.reduce((s, f) => s + f.kobo, 0);
  const mins = l.minutes_to_gate ?? l.area_minutes;
  const inspected = checks[0]?.checked_at ? new Date(checks[0].checked_at).toLocaleDateString("en-NG", { dateStyle: "long" }) : null;

  return (
    <div className="mx-auto max-w-6xl lg:px-10 lg:py-8">
      <div className="lg:grid lg:grid-cols-[1.25fr_1fr] lg:items-start lg:gap-8">
        <div className="relative lg:sticky lg:top-8">
          <Gallery photos={photos.map((p) => ({ url: photoUrl(p.storage_path), caption: p.caption }))} tint={areaTint(l.area_slug)} title={l.title} />
          <Link href="/listings" aria-label="Back to rooms" className="absolute left-3 top-3 flex size-11 items-center justify-center rounded-full bg-white lg:hidden"><Icon name="back" /></Link>
        </div>

        <div className="relative -mt-5 flex flex-col gap-4 rounded-t-[22px] bg-sand px-5 pb-8 pt-5 lg:mt-0 lg:rounded-none lg:p-0">
          <Link href="/listings" className="hidden text-sm font-semibold text-brand lg:block">← All rooms</Link>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-bold text-brand">Verified</span>
              <span className="rounded-full bg-amber-soft px-2.5 py-1 text-xs font-bold text-amber-ink">Escrow protected</span>
            </div>
            <SaveButton listingId={l.id} saved={saved} />
          </div>
          <div>
            <h1 className="font-display text-[26px] font-bold leading-tight lg:text-3xl">{l.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {l.area_name}{mins != null && ` · ${mins} min to ${l.university_name} main gate`} · {PROPERTY_TYPES[l.property_type]} · {l.furnished ? "Furnished" : "Unfurnished"}
            </p>
          </div>

          <section className="rounded-2xl border border-line bg-white p-4">
            {fees.map((f) => (
              <div key={f.label} className="flex justify-between py-1 text-sm text-body"><span>{f.label}</span><span>{formatNaira(f.kobo)}</span></div>
            ))}
            <div className="mt-2 flex justify-between border-t border-line pt-2.5 font-bold"><span>Total into escrow</span><span>{formatNaira(total)}</span></div>
          </section>

          <section className="flex flex-col gap-2.5 rounded-2xl bg-ink p-4 text-white">
            <h2 className="font-bold">How escrow protects you</h2>
            {["Inspect first. Never pay before you see the room.", "Pay into LiveOff-K escrow, not to anyone directly.", "Move in and check everything works.", "Confirm, and only then the landlord is paid."].map((t, k) => (
              <p key={t} className="flex items-center gap-2.5 text-[13px] text-on-brand">
                <span className="flex size-6 flex-none items-center justify-center rounded-full bg-amber text-xs font-bold text-ink">{k + 1}</span>{t}
              </p>
            ))}
          </section>

          <section className="flex flex-col gap-3 rounded-[30px] border-2 border-brand bg-white p-4">
            {payment ? (
              <>
                <h2 className="text-lg font-bold">You&apos;ve started paying for this room</h2>
                <Link href={`/payments/${payment.id}`} className="btn-primary h-12">Track your payment</Link>
              </>
            ) : inspection ? (
              <>
                <h2 className="text-lg font-bold">Happy with the room?</h2>
                <p className="text-sm text-muted">
                  Inspection {inspection.status === "completed" ? "done" : `booked for ${new Date(inspection.requested_for).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })}`}.
                  Pay only after you&apos;ve seen it. The landlord is paid when you confirm you&apos;ve moved in.
                </p>
                <PayForm listingId={l.id} total={formatNaira(total)} email={email} />
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold">Step 1: book a free inspection</h2>
                <p className="text-sm text-muted">See the room before you pay anything.</p>
                <BookInspection listingId={l.id} />
              </>
            )}
            <Link href={`/support?listing=${l.id}`} className="btn-ghost h-11">Ask support about this room</Link>
          </section>

          <section className="card p-4">
            <h2 className="font-bold">About this room</h2>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-body">{l.description || "No description yet."}</p>
            {l.facilities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {l.facilities.map((f) => <span key={f} className="rounded-full border border-line bg-sand px-3 py-1.5 text-sm">{f}</span>)}
              </div>
            )}
          </section>

          <section className="card p-4">
            <h2 className="font-bold">What we checked</h2>
            {inspected && <p className="mt-0.5 text-[13px] text-muted">Inspected in person by LiveOff-K staff on {inspected}</p>}
            <ul className="mt-2.5 flex flex-col gap-2">
              {checks.map((c) => <li key={c.label} className="flex items-center gap-2 text-[15px]"><Icon name="check" size={18} className="text-brand" />{c.label}</li>)}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function ListingPage({ params }: Props) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Content params={params} />
    </Suspense>
  );
}
