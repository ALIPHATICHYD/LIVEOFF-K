import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ItemThumb } from "@/components/market/ItemThumb";
import { MarketCard } from "@/components/market/MarketCard";
import { PageLoading } from "@/components/PageLoading";
import { SetupNotice } from "@/components/SetupNotice";
import { formatNaira } from "@/lib/format";
import { timeAgo, type MarketCategory, type MarketItem } from "@/lib/market";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { closeWanted } from "../actions";

export const metadata: Metadata = { title: "My market" };

const STATUS = { active: "On sale", reserved: "Buyer paying", sold: "Sold", removed: "Removed" } as const;

async function Content() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect("/login?next=/market/mine");

  const [{ data: items }, { data: wanted }, { data: saved }] = await Promise.all([
    supabase.from("market_items").select("id, title, price_kobo, status, category, created_at, market_requests(count), market_photos(storage_path, sort_order)")
      .eq("seller_id", uid).order("created_at", { ascending: false }),
    supabase.from("market_wanted").select("id, text, is_open, created_at, market_offers(id, message, contact, created_at)")
      .eq("user_id", uid).order("created_at", { ascending: false }),
    supabase.from("market_saved").select("item_id").eq("user_id", uid),
  ]);
  const savedIds = (saved ?? []).map((s) => s.item_id);
  const { data: savedItems } = savedIds.length ? await supabase.from("market_items_public").select("*").in("id", savedIds) : { data: [] };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-6 lg:py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">My market</h1>
        <Link href="/market/sell" className="btn h-11 bg-amber px-4 text-ink">+ Sell</Link>
      </div>

      <section className="flex flex-col gap-2.5">
        <h2 className="font-display text-xl font-bold">Things I&apos;m selling</h2>
        {(items ?? []).map((i) => {
          const cover = [...((i.market_photos as { storage_path: string; sort_order: number }[]) ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path ?? null;
          const msgs = (i.market_requests as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <Link key={i.id} href={`/market/${i.id}`} className="card flex items-center gap-3 p-3 text-ink hover:border-brand">
              <ItemThumb category={i.category as MarketCategory} cover={cover} title={i.title} className="size-16 flex-none rounded-xl" iconSize={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{i.title}</p>
                <p className="text-sm text-muted">{formatNaira(Number(i.price_kobo))} · {msgs} message{msgs === 1 ? "" : "s"} · {timeAgo(i.created_at)}</p>
              </div>
              <span className={`flex-none rounded-full px-2.5 py-1 text-xs font-bold ${i.status === "active" ? "bg-mint text-brand" : i.status === "reserved" ? "bg-[#fff3d1] text-[#6b4a00]" : "bg-sand text-muted"}`}>{STATUS[i.status as keyof typeof STATUS]}</span>
            </Link>
          );
        })}
        {!items?.length && <p className="card p-5 text-center text-muted">Nothing listed yet. Moving out soon? <Link href="/market/sell" className="font-semibold text-brand">Sell it as a bundle</Link>.</p>}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="font-display text-xl font-bold">My wanted requests</h2>
        {(wanted ?? []).map((w) => {
          const offers = (w.market_offers as { id: string; message: string; contact: string; created_at: string }[]) ?? [];
          return (
            <div key={w.id} className="card flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-bold">{w.text}</p><p className="text-xs text-muted">{w.is_open ? "Open" : "Closed"} · posted {timeAgo(w.created_at)} · {offers.length} offer{offers.length === 1 ? "" : "s"}</p></div>
                {w.is_open && <form action={closeWanted}><input type="hidden" name="wantedId" value={w.id} /><button className="btn-ghost h-9 text-sm">Close</button></form>}
              </div>
              {offers.map((o) => (
                <div key={o.id} className="rounded-xl bg-sand p-3 text-sm"><p>{o.message}</p><p className="mt-1 font-semibold">{o.contact} <span className="font-normal text-muted">· {timeAgo(o.created_at)}</span></p></div>
              ))}
            </div>
          );
        })}
        {!wanted?.length && <p className="card p-5 text-center text-muted">Looking for something? <Link href="/market#wanted" className="font-semibold text-brand">Post a wanted request</Link>.</p>}
      </section>

      {!!savedItems?.length && (
        <section className="flex flex-col gap-2.5">
          <h2 className="font-display text-xl font-bold">Saved items</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(savedItems as MarketItem[]).map((i) => <MarketCard key={i.id} item={i} saved />)}</div>
        </section>
      )}
    </div>
  );
}

export default function MinePage() {
  return <Suspense fallback={<PageLoading />}><Content /></Suspense>;
}
