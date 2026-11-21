import { Suspense } from "react";
import { PageLoading } from "@/components/PageLoading";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SetupNotice } from "@/components/SetupNotice";
import { PROPERTY_TYPES, formatNaira } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { PublicListing } from "@/lib/types";
import { BookInspection } from "./BookInspection";

type Props = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

async function load(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: listing } = await supabase.from("listings_public").select("*").eq("id", id).maybeSingle();
  if (!listing) return null;
  const [{ data: photos }, { data: checks }] = await Promise.all([
    supabase.from("listing_photos").select("storage_path, caption").eq("listing_id", id).order("sort_order"),
    supabase.from("verification_checks").select("label, passed, checked_at").eq("listing_id", id).eq("passed", true),
  ]);
  return { listing: listing as PublicListing, photos: photos ?? [], checks: checks ?? [] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isSupabaseConfigured) return {};
  const data = await load((await params).id);
  return data ? { title: data.listing.title } : {};
}

async function ListingPageContent({ params }: Props) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const data = await load((await params).id);
  if (!data) notFound();
  const { listing: l, photos, checks } = data;
  const fees = [
    { label: `Rent (${l.min_rental_months} months)`, kobo: l.rent_per_year_kobo },
    { label: "Agent fee", kobo: l.agent_fee_kobo },
    { label: "Caution fee (refundable)", kobo: l.caution_fee_kobo },
    { label: l.other_fees_note || "Other fees", kobo: l.other_fees_kobo },
  ].filter((f) => f.kobo > 0);
  const total = fees.reduce((s, f) => s + f.kobo, 0);
  const inspected = checks[0]?.checked_at ? new Date(checks[0].checked_at).toLocaleDateString("en-NG", { dateStyle: "long" }) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-16 pt-7">
      <nav aria-label="Breadcrumb" className="flex gap-2 text-sm text-muted">
        <Link href="/listings">{l.university_name}</Link><span aria-hidden>/</span>
        <Link href={`/listings?area=${l.area_slug}`}>{l.area_name}</Link>
      </nav>
      <div>
        <span className="rounded-full bg-mint px-3 py-1 text-[13px] font-semibold text-brand">Verified</span>
        <h1 className="mt-3 font-display text-4xl font-bold">{l.title}</h1>
        <p className="mt-1.5 text-muted">
          {l.area_name}, Gwagwalada{l.minutes_to_gate != null && ` · about ${l.minutes_to_gate} minutes to the main gate`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {photos.length ? photos.slice(0, 5).map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- resized on upload
          <img key={p.storage_path} src={photoUrl(p.storage_path)} alt={p.caption ?? ""} className={`h-48 w-full rounded-2xl object-cover ${i === 0 ? "col-span-2 row-span-2 h-full" : ""}`} />
        )) : <div className="col-span-full flex h-48 items-center justify-center rounded-2xl bg-photo text-muted">No photos yet</div>}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <section className="card p-6">
            <h2 className="text-xl font-bold">About this room</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-[#3f4f47]">{l.description || "No description yet."}</p>
            <p className="mt-3 text-sm text-muted">
              {PROPERTY_TYPES[l.property_type]} · {l.bedrooms} bedroom{l.bedrooms === 1 ? "" : "s"} · {l.furnished ? "Furnished" : "Unfurnished"}
              {l.available_from && ` · Available from ${new Date(l.available_from).toLocaleDateString("en-NG", { dateStyle: "medium" })}`}
            </p>
          </section>
          {l.facilities.length > 0 && (
            <section className="card p-6">
              <h2 className="text-xl font-bold">Facilities</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {l.facilities.map((f) => <span key={f} className="rounded-full border border-line bg-sand px-3.5 py-2 text-sm">{f}</span>)}
              </div>
            </section>
          )}
          <section className="card p-6">
            <h2 className="text-xl font-bold">What we checked</h2>
            {inspected && <p className="mt-1 text-[13px] text-muted">Inspected in person by LiveOff-K staff on {inspected}</p>}
            <ul className="mt-3 flex flex-col gap-2.5">
              {checks.map((c) => <li key={c.label}>✓ {c.label}</li>)}
            </ul>
            <p className="mt-3 text-[13px] text-muted">Verified only means these checks were done. Featured listings are never verified automatically.</p>
          </section>
        </div>

        <aside className="flex w-full flex-col gap-5 lg:w-[380px] lg:flex-none">
          <section className="card flex flex-col gap-3 p-6">
            <p className="font-display text-3xl font-bold">{formatNaira(l.rent_per_year_kobo)} <span className="font-sans text-sm font-normal text-muted">per year</span></p>
            <h2 className="font-bold">Every fee, upfront</h2>
            {fees.map((f) => (
              <div key={f.label} className="flex justify-between text-[15px] text-[#3f4f47]"><span>{f.label}</span><span>{formatNaira(f.kobo)}</span></div>
            ))}
            <div className="flex justify-between border-t border-line pt-3 text-lg font-bold"><span>First payment</span><span>{formatNaira(total)}</span></div>
          </section>
          <section className="card flex flex-col gap-3 border-2 border-brand p-6">
            <h2 className="text-xl font-bold">Book an inspection</h2>
            <p className="text-sm text-muted">Free. Never pay before you inspect. LiveOff-K will never ask you to pay into a personal account.</p>
            <BookInspection listingId={l.id} />
          </section>
        </aside>
      </div>
    </div>
  );
}

export default function ListingPage({ params }: Props) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ListingPageContent params={params} />
    </Suspense>
  );
}
