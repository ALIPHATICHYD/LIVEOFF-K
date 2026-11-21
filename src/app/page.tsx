import { Suspense } from "react";
import { PageLoading } from "@/components/PageLoading";
import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";
import { photoUrl } from "@/lib/photos";
import { PROPERTY_TYPES, VERIFICATION_CHECKS } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Area, PublicListing } from "@/lib/types";

async function loadHome() {
  if (!isSupabaseConfigured) return { listings: [] as PublicListing[], areas: [] as Area[], photos: new Map<string, string>() };
  const supabase = await createClient();
  const [{ data: listings }, { data: areas }] = await Promise.all([
    supabase.from("listings_public").select("*").eq("university_slug", "uniabuja")
      .order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(6),
    supabase.from("areas").select("id, slug, name, university_id").order("name"),
  ]);
  const ids = (listings ?? []).map((l) => l.id);
  const { data: photos } = ids.length
    ? await supabase.from("listing_photos").select("listing_id, storage_path").in("listing_id", ids).order("sort_order")
    : { data: [] };
  const first = new Map<string, string>();
  for (const p of photos ?? []) if (!first.has(p.listing_id)) first.set(p.listing_id, photoUrl(p.storage_path));
  return { listings: (listings ?? []) as PublicListing[], areas: (areas ?? []) as Area[], photos: first };
}

async function HomeContent() {
  const { listings, areas, photos } = await loadHome();
  return (
    <>
      <section className="bg-brand text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 pb-24 pt-16">
          <p className="flex items-center gap-2 text-base font-medium text-[#cfe3d7]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F2A900" strokeWidth="2.2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
            Gwagwalada, for University of Abuja students
          </p>
          <h1 className="max-w-3xl font-display text-5xl font-bold leading-[1.05] md:text-[56px]">
            Everything You Need to Live Better as a Student.
          </h1>
          <p className="max-w-2xl text-lg text-mint">
            Find accommodation, shop for household essentials and connect with trusted service providers, all in one place.
          </p>
          <form action="/listings" className="mt-4 grid grid-cols-1 items-end gap-3 rounded-2xl bg-white p-4 text-ink sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#3f4f47]">Area
              <select name="area" className="field">
                <option value="">Any area</option>
                {areas.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#3f4f47]">Property type
              <select name="type" className="field">
                <option value="">Any type</option>
                {Object.entries(PROPERTY_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#3f4f47]">Max rent per year (₦)
              <input name="max" inputMode="numeric" placeholder="e.g. 500000" className="field" />
            </label>
            <button className="btn-primary h-12">Search rooms</button>
          </form>
          <p className="text-sm text-mint">Every listing marked Verified has been visited in person by the LiveOff-K team. All fees are shown upfront.</p>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl font-bold">Verified rooms near UniAbuja</h2>
          <Link href="/listings" className="font-semibold text-brand">See all listings</Link>
        </div>
        {listings.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => <ListingCard key={l.id} listing={l} photoUrl={photos.get(l.id)} />)}
          </div>
        ) : (
          <p className="card p-6 text-muted">No verified rooms yet. Our team is inspecting the first properties now.</p>
        )}
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-2xl font-bold">How LiveOff-K works</h2>
          <ol className="mt-4 flex flex-col gap-3 text-[15px]">
            <li><b>1. Search.</b> Filter by area, price and room type.</li>
            <li><b>2. Inspect.</b> Book a free inspection. Never pay before you see the room.</li>
            <li><b>3. Move in.</b> Pay the landlord or agent the fees you saw upfront, nothing extra.</li>
          </ol>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-2xl font-bold">What &ldquo;Verified&rdquo; means</h2>
          <ul className="mt-4 flex flex-col gap-2 text-[15px]">
            {VERIFICATION_CHECKS.map((c) => <li key={c.key}>✓ {c.label}</li>)}
          </ul>
          <p className="mt-3 text-[13px] text-muted">Featured listings are never verified automatically.</p>
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-12">
          <div>
            <h2 className="font-display text-2xl font-bold">Own or manage rooms near UniAbuja?</h2>
            <p className="mt-1 text-[#cfe3d7]">List for free. Your listing goes live after our team inspects it.</p>
          </div>
          <Link href="/upload" className="btn h-12 bg-amber text-ink">List a property</Link>
        </div>
      </section>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HomeContent  />
    </Suspense>
  );
}
