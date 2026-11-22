import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icons";
import { BundleCard, MarketCard } from "@/components/market/MarketCard";
import { OfferButton, PostWanted } from "@/components/market/WantedForms";
import { PageLoading } from "@/components/PageLoading";
import { SetupNotice } from "@/components/SetupNotice";
import { SkyBand } from "@/components/welcome/SkyBand";
import { formatNaira } from "@/lib/format";
import { MARKET_CATEGORIES, timeAgo, type MarketCategory, type MarketItem } from "@/lib/market";
import { getPrefs } from "@/lib/prefs";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Student Market: buy and sell near University of Abuja" };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Browse({ searchParams }: { searchParams: Promise<Search> }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const [sp, prefs] = await Promise.all([searchParams, getPrefs()]);
  const uni = one(sp.uni) || prefs?.uni || "uniabuja";
  const cat = (one(sp.cat) in MARKET_CATEGORIES ? one(sp.cat) : "") as MarketCategory | "";
  const q = one(sp.q).trim().slice(0, 60).replace(/[%_,()]/g, " ");

  const supabase = await createClient();
  const { data: university } = await supabase.from("universities").select("id, slug, name, short_name").eq("slug", uni).maybeSingle();
  if (!university) redirect("/");
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;

  let query = supabase.from("market_items_public").select("*").eq("university_slug", uni).eq("is_bundle", false);
  if (cat) query = query.eq("category", cat);
  if (q) query = query.ilike("title", `%${q}%`);
  const showBundles = !cat && !q;
  const [{ data: itemRows, error }, { data: bundleRows }, { data: areas }, { data: wantedRows }, saved] = await Promise.all([
    query.order("created_at", { ascending: false }).limit(48),
    showBundles ? supabase.from("market_items_public").select("*").eq("university_slug", uni).eq("is_bundle", true).eq("status", "active").order("created_at", { ascending: false }).limit(6)
      : Promise.resolve({ data: [] }),
    supabase.from("areas").select("id, name").eq("university_id", university.id).order("sort_order"),
    supabase.from("market_wanted").select("id, user_id, text, max_price_kobo, created_at, areas(name)").eq("university_id", university.id).eq("is_open", true)
      .order("created_at", { ascending: false }).limit(9),
    uid ? supabase.from("market_saved").select("item_id").eq("user_id", uid) : Promise.resolve({ data: [] as { item_id: string }[] }),
  ]);
  const items = (itemRows ?? []) as MarketItem[];
  const bundles = (bundleRows ?? []) as MarketItem[];
  const savedIds = new Set((saved.data ?? []).map((s) => s.item_id));
  const href = (c?: string) => (c ? `/market?cat=${c}` : "/market");

  return (
    <div>
      <section className="relative overflow-hidden rounded-b-[28px] bg-brand px-5 pb-12 pt-5 text-white lg:px-10 lg:pb-16 lg:pt-8">
        <SkyBand />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[13px] font-semibold">
              <Icon name="cap" size={14} className="text-amber" />{university.short_name ?? university.name} students only
            </span>
            {uid && <Link href="/market/mine" className="text-[13px] font-semibold text-[#cfe3d7] underline-offset-4 hover:underline">My listings</Link>}
          </div>
          <h1 className="font-display text-[28px] font-bold leading-tight lg:text-[38px]">Student Market</h1>
          <p className="max-w-xl text-[15px] text-[#cfe3d7]">Buy and sell room stuff, books and gadgets with students near you. Pay through escrow, so the seller gets paid only after you have the item.</p>
          <div className="flex gap-2">
            <form action="/market" className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-[14px] bg-white px-3.5 text-ink">
              {cat && <input type="hidden" name="cat" value={cat} />}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="flex-none text-muted"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input name="q" defaultValue={q} aria-label="Search the market" placeholder="Search mattress, gas, textbooks…" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
            </form>
            <Link href="/market/sell" className="btn h-12 flex-none bg-amber px-4 text-ink">+ Sell</Link>
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            <Link href={href()} className={`flex flex-none items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold ${!cat ? "bg-amber text-ink" : "bg-white/10 text-white"}`}><Icon name="grid" size={15} />All</Link>
            {(Object.keys(MARKET_CATEGORIES) as MarketCategory[]).map((c) => (
              <Link key={c} href={href(c)} className={`flex flex-none items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold ${cat === c ? "bg-amber text-ink" : "bg-white/10 text-white"}`}>
                <Icon name={MARKET_CATEGORIES[c].icon} size={15} />{MARKET_CATEGORIES[c].label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-7 px-5 py-6 lg:px-10 lg:py-8">
        {bundles.length > 0 && (
          <section className="flex flex-col gap-3">
            <div><h2 className="font-display text-xl font-bold">Moving-out bundles</h2><p className="text-sm text-muted">Whole rooms of stuff, one price</p></div>
            <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
              {bundles.map((b, k) => <BundleCard key={b.id} item={b} index={k} />)}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-bold">
            {error ? "Could not load the market" : q ? `Results for “${q}”` : cat ? MARKET_CATEGORIES[cat].label : "Fresh on the market"}
          </h2>
          {items.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
              {items.map((i) => <MarketCard key={i.id} item={i} saved={savedIds.has(i.id)} />)}
            </div>
          ) : !error && (
            <div className="card p-6 text-center text-muted">
              Nothing here yet. Post a &ldquo;wanted&rdquo; request below and sellers will see it, or <Link href="/market/sell" className="font-semibold text-brand">sell something</Link>.
            </div>
          )}
        </section>

        <section id="wanted" className="flex scroll-mt-20 flex-col gap-3 rounded-3xl bg-[#fff3d1] p-4 lg:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-display text-xl font-bold text-[#3d2a00]">Wanted</h2><p className="text-sm text-[#6b4a00]">Students looking for something. Got it? Make an offer.</p></div>
            <PostWanted universityId={university.id} areas={areas ?? []} />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {(wantedRows ?? []).map((w) => {
              const area = (w.areas as unknown as { name: string } | null)?.name;
              const mine = w.user_id === uid;
              return (
                <div key={w.id} className="flex flex-col gap-2 rounded-2xl bg-white p-3.5">
                  <p className="font-semibold">{w.text}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted">{[area ?? "Any area", w.max_price_kobo ? `up to ${formatNaira(Number(w.max_price_kobo))}` : null, timeAgo(w.created_at)].filter(Boolean).join(" · ")}</span>
                    {mine ? <Link href="/market/mine" className="text-xs font-bold text-brand">Your request · see offers</Link> : <OfferButton wantedId={w.id} />}
                  </div>
                </div>
              );
            })}
            {!wantedRows?.length && <p className="text-sm text-[#6b4a00]">No requests yet. Be the first to post one.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function MarketPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Browse searchParams={searchParams} />
    </Suspense>
  );
}
