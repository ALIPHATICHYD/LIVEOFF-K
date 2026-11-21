import { Suspense } from "react";
import { PageLoading } from "@/components/PageLoading";
import type { Metadata } from "next";
import { ListingCard } from "@/components/ListingCard";
import { SetupNotice } from "@/components/SetupNotice";
import { PROPERTY_TYPES, nairaToKobo } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Area, PublicListing } from "@/lib/types";

export const metadata: Metadata = { title: "Student rooms near University of Abuja" };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const SORTS = { rent: "Lowest rent", distance: "Closest to campus", newest: "Newest" } as const;

async function ListingsPageContent({ searchParams }: { searchParams: Promise<Search> }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const sp = await searchParams;
  const areaSlugs = many(sp.area).filter(Boolean);
  const types = many(sp.type).filter((t) => t in PROPERTY_TYPES);
  const min = Number(one(sp.min).replace(/\D/g, "")) || 0;
  const max = Number(one(sp.max).replace(/\D/g, "")) || 0;
  const bedrooms = Number(one(sp.bedrooms)) || 0;
  const furnished = one(sp.furnished) === "1";
  const q = one(sp.q).trim().slice(0, 80);
  const sort = (one(sp.sort) in SORTS ? one(sp.sort) : "rent") as keyof typeof SORTS;

  const supabase = await createClient();
  const { data: areas } = await supabase.from("areas").select("id, slug, name, university_id").order("name");

  let query = supabase.from("listings_public").select("*").eq("university_slug", "uniabuja");
  if (areaSlugs.length) query = query.in("area_slug", areaSlugs);
  if (types.length) query = query.in("property_type", types);
  if (min) query = query.gte("rent_per_year_kobo", nairaToKobo(min));
  if (max) query = query.lte("rent_per_year_kobo", nairaToKobo(max));
  if (bedrooms) query = query.eq("bedrooms", bedrooms);
  if (furnished) query = query.eq("furnished", true);
  if (q) query = query.textSearch("search", q, { type: "websearch", config: "english" });
  query =
    sort === "distance" ? query.order("minutes_to_gate", { ascending: true, nullsFirst: false })
    : sort === "newest" ? query.order("created_at", { ascending: false })
    : query.order("rent_per_year_kobo", { ascending: true });
  const { data, error } = await query.limit(60);
  const listings = (data ?? []) as PublicListing[];

  const ids = listings.map((l) => l.id);
  const { data: photos } = ids.length
    ? await supabase.from("listing_photos").select("listing_id, storage_path").in("listing_id", ids).order("sort_order")
    : { data: [] };
  const first = new Map<string, string>();
  for (const p of photos ?? []) if (!first.has(p.listing_id)) first.set(p.listing_id, photoUrl(p.storage_path));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-16 pt-8">
      <div>
        <h1 className="font-display text-4xl font-bold">Student rooms near University of Abuja</h1>
        <p className="mt-1.5 text-muted">{error ? "Could not load rooms. Try again." : `Showing ${listings.length} verified room${listings.length === 1 ? "" : "s"}.`}</p>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <form className="card flex w-full flex-col gap-5 p-5 lg:w-72 lg:flex-none" aria-label="Filters">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Keyword
            <input name="q" defaultValue={q} placeholder="e.g. borehole, tiled" className="field" />
          </label>
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2 text-[13px] font-semibold">Area</legend>
            {(areas as Area[] | null)?.map((a) => (
              <label key={a.id} className="flex items-center gap-2.5 text-[15px]">
                <input type="checkbox" name="area" value={a.slug} defaultChecked={areaSlugs.includes(a.slug)} className="size-5 accent-brand" />{a.name}
              </label>
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2 text-[13px] font-semibold">Property type</legend>
            {Object.entries(PROPERTY_TYPES).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2.5 text-[15px]">
                <input type="checkbox" name="type" value={v} defaultChecked={types.includes(v as keyof typeof PROPERTY_TYPES)} className="size-5 accent-brand" />{l}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Rent per year (₦)</span>
            <div className="flex gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted">Min<input name="min" inputMode="numeric" defaultValue={min || ""} className="field" /></label>
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted">Max<input name="max" inputMode="numeric" defaultValue={max || ""} className="field" /></label>
            </div>
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Bedrooms
            <select name="bedrooms" defaultValue={bedrooms || ""} className="field">
              <option value="">Any</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
            </select>
          </label>
          <label className="flex items-center gap-2.5 text-[15px]">
            <input type="checkbox" name="furnished" value="1" defaultChecked={furnished} className="size-5 accent-brand" />Furnished only
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Sort by
            <select name="sort" defaultValue={sort} className="field">
              {Object.entries(SORTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <button className="btn-primary h-12">Show rooms</button>
        </form>
        <div className="grid min-w-0 flex-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((l) => <ListingCard key={l.id} listing={l} photoUrl={first.get(l.id)} />)}
          {!listings.length && <p className="card p-6 text-muted sm:col-span-2">No rooms match these filters yet.</p>}
        </div>
      </div>
    </div>
  );
}

export default function ListingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ListingsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
