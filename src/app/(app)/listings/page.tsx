import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icons";
import { ListingCard } from "@/components/ListingCard";
import { PageLoading } from "@/components/PageLoading";
import { SetupNotice } from "@/components/SetupNotice";
import { PROPERTY_TYPES, nairaToKobo } from "@/lib/format";
import { cardExtras } from "@/lib/listings";
import { BUDGETS, getPrefs } from "@/lib/prefs";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Area, PublicListing } from "@/lib/types";

export const metadata: Metadata = { title: "Student rooms near University of Abuja" };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const SORTS = { rent: "Lowest rent", distance: "Closest to campus", newest: "Newest" } as const;

async function Feed({ searchParams }: { searchParams: Promise<Search> }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const [sp, prefs] = await Promise.all([searchParams, getPrefs()]);
  // UniAbuja is the only live campus for now
  const uni = one(sp.uni) || prefs?.uni || "uniabuja";

  const supabase = await createClient();
  const { data: university } = await supabase.from("universities").select("id, slug, name, short_name").eq("slug", uni).maybeSingle();
  if (!university) redirect("/");
  const { data: areaRows } = await supabase.from("areas").select("id, slug, name, university_id, minutes_to_campus").eq("university_id", university.id).order("sort_order");
  const areas = (areaRows ?? []) as Area[];

  const myAreas = prefs?.uni === uni ? prefs.areas : [];
  const chip = one(sp.area);
  const areaFilter = chip ? [chip] : many(sp.areas).length ? many(sp.areas) : myAreas;
  const budget = BUDGETS.find((b) => b.id === (one(sp.budget) || prefs?.budget || "any"));
  const types = many(sp.type).filter((t) => t in PROPERTY_TYPES);
  const min = Number(one(sp.min).replace(/\D/g, "")) || budget?.min || 0;
  const max = Number(one(sp.max).replace(/\D/g, "")) || budget?.max || 0;
  const furnished = one(sp.furnished) === "1";
  const q = one(sp.q).trim().slice(0, 80);
  const sort = (one(sp.sort) in SORTS ? one(sp.sort) : "distance") as keyof typeof SORTS;

  let query = supabase.from("listings_public").select("*").eq("university_slug", uni);
  if (areaFilter.length) query = query.in("area_slug", areaFilter);
  if (types.length) query = query.in("property_type", types);
  if (min) query = query.gte("rent_per_year_kobo", nairaToKobo(min));
  if (max) query = query.lt("rent_per_year_kobo", nairaToKobo(max));
  if (furnished) query = query.eq("furnished", true);
  if (q) query = query.textSearch("search", q, { type: "websearch", config: "english" });
  query = sort === "distance" ? query.order("area_minutes", { ascending: true, nullsFirst: false }).order("minutes_to_gate", { ascending: true, nullsFirst: false })
    : sort === "newest" ? query.order("created_at", { ascending: false })
    : query.order("rent_per_year_kobo", { ascending: true });
  const { data, error } = await query.limit(60);
  const listings = (data ?? []) as PublicListing[];
  const { first, saved } = await cardExtras(supabase, listings.map((l) => l.id));

  const chipAreas = myAreas.length ? areas.filter((a) => myAreas.includes(a.slug)) : areas;
  const chipHref = (slug?: string) => (slug ? `/listings?area=${slug}` : "/listings");

  return (
    <div>
      <section className="rounded-b-[28px] bg-brand px-5 pb-6 pt-5 text-white lg:px-10 lg:pb-8 lg:pt-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3.5">
          <Link href={`/start/${uni}`} className="flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-2 text-[13px] font-semibold hover:bg-white/15">
            <Icon name="pin" size={14} className="text-amber" />
            {university.short_name ?? university.name} · {myAreas.length ? `${myAreas.length} area${myAreas.length === 1 ? "" : "s"}` : "all areas"} · change
          </Link>
          <h1 className="font-display text-[26px] font-bold leading-tight lg:text-4xl">
            {error ? "Could not load rooms" : `${listings.length} verified room${listings.length === 1 ? "" : "s"} picked for you`}
          </h1>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            <Link href={chipHref()} className={`flex-none rounded-full px-3.5 py-2 text-[13px] font-semibold ${!chip ? "bg-amber text-ink" : "bg-white/10 text-white"}`}>All</Link>
            {chipAreas.map((a) => (
              <Link key={a.slug} href={chipHref(a.slug)} className={`flex-none rounded-full px-3.5 py-2 text-[13px] font-semibold ${chip === a.slug ? "bg-amber text-ink" : "bg-white/10 text-white"}`}>
                {a.name}{a.minutes_to_campus != null && <span className="opacity-70"> · {a.minutes_to_campus}m</span>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 lg:px-10 lg:py-7">
        <div className="flex items-center gap-2.5 rounded-[14px] bg-[#fff3d1] p-3 text-[13px] text-[#6b4a00]">
          <Icon name="shield" className="flex-none" />
          Pay through LiveOff-K. Your money is held in escrow until you confirm you&apos;ve moved in.
        </div>

        <details className="card group p-4">
          <summary className="cursor-pointer list-none font-semibold text-brand">More filters <span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span></summary>
          <form className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {chip && <input type="hidden" name="area" value={chip} />}
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Keyword<input name="q" defaultValue={q} placeholder="e.g. borehole, tiled" className="field" /></label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Property type
              <select name="type" defaultValue={types[0] ?? ""} className="field"><option value="">Any type</option>{Object.entries(PROPERTY_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <div className="flex gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-[13px] font-semibold">Min ₦<input name="min" inputMode="numeric" defaultValue={min || ""} className="field" /></label>
              <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-[13px] font-semibold">Max ₦<input name="max" inputMode="numeric" defaultValue={max || ""} className="field" /></label>
            </div>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Sort by
              <select name="sort" defaultValue={sort} className="field">{Object.entries(SORTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <label className="flex items-center gap-2.5 text-[15px]"><input type="checkbox" name="furnished" value="1" defaultChecked={furnished} className="size-5 accent-brand" />Furnished only</label>
            <button className="btn-primary sm:col-start-2 lg:col-start-4">Show rooms</button>
          </form>
        </details>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:gap-5">
          {listings.map((l) => <ListingCard key={l.id} listing={l} photoUrl={first.get(l.id)} saved={saved.has(l.id)} />)}
        </div>
        {!listings.length && !error && (
          <div className="card p-6 text-center text-muted">
            No verified rooms here yet. <Link href={`/start/${uni}`} className="font-semibold text-brand">Try other areas</Link> or a bigger budget.
          </div>
        )}
      </div>
    </div>
  );
}

export default function ListingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Feed searchParams={searchParams} />
    </Suspense>
  );
}
