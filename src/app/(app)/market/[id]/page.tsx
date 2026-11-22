import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icons";
import { BuyPanel } from "@/components/market/BuyPanel";
import { MarketPhotoUploader } from "@/components/market/MarketPhotoUploader";
import { MarketSaveButton } from "@/components/market/MarketSaveButton";
import { PageLoading } from "@/components/PageLoading";
import { SetupNotice } from "@/components/SetupNotice";
import { formatNaira } from "@/lib/format";
import { MARKET_CATEGORIES, MARKET_CONDITIONS, marketFeeKobo, marketPhotoUrl, timeAgo, type MarketItem } from "@/lib/market";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { Gallery } from "../../listings/[id]/Gallery";
import { removeItem } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };
const UUID = /^[0-9a-f-]{36}$/i;

async function load(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub ?? null;
  const { data: pub } = await supabase.from("market_items_public").select("*").eq("id", id).maybeSingle();
  let item = pub as MarketItem | null;
  // Sellers can still open their own sold or removed items.
  if (!item && uid) {
    const { data: own } = await supabase.from("market_items").select("*, areas(name, slug)").eq("id", id).eq("seller_id", uid).maybeSingle();
    if (own) {
      const a = own.areas as unknown as { name: string; slug: string };
      item = { ...own, area_name: a.name, area_slug: a.slug, university_slug: "", seller_name: "You", seller_verified: false, cover_path: null } as MarketItem;
    }
  }
  return item ? { supabase, uid, item } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isSupabaseConfigured) return {};
  const data = await load((await params).id);
  return data ? { title: data.item.title } : {};
}

async function Content({ params, searchParams }: Props) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const data = await load(id);
  if (!data) notFound();
  const { supabase, uid, item: it } = data;
  const isSeller = uid === it.seller_id;

  const [{ data: photos }, saved, profile, requests, myOrder] = await Promise.all([
    supabase.from("market_photos").select("storage_path").eq("item_id", it.id).order("sort_order"),
    uid ? supabase.from("market_saved").select("item_id").eq("user_id", uid).eq("item_id", it.id).maybeSingle() : Promise.resolve({ data: null }),
    uid ? supabase.from("profiles").select("email").eq("id", uid).maybeSingle() : Promise.resolve({ data: null }),
    isSeller ? supabase.from("market_requests").select("id, message, contact, created_at").eq("item_id", it.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; message: string; contact: string; created_at: string }[] }),
    uid && !isSeller ? supabase.from("payments").select("id, status").eq("market_item_id", it.id).eq("student_id", uid)
      .not("status", "in", "(failed,cancelled,refunded)").order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const cat = MARKET_CATEGORIES[it.category];
  const fee = marketFeeKobo(it.price_kobo);
  const order = myOrder.data as { id: string; status: string } | null;

  return (
    <div className="mx-auto max-w-6xl lg:px-10 lg:py-8">
      <div className="lg:grid lg:grid-cols-[1.2fr_1fr] lg:items-start lg:gap-8">
        <div className="relative lg:sticky lg:top-8">
          {photos?.length ? (
            <Gallery photos={photos.map((p, k) => ({ url: marketPhotoUrl(p.storage_path), caption: `Seller's photo, ${k + 1} of ${photos.length}` }))} tint={cat.tint} title={it.title} />
          ) : (
            <div className="flex h-64 items-center justify-center sm:h-80 lg:h-[440px] lg:rounded-3xl" style={{ background: cat.tint }}>
              <Icon name={cat.icon} size={120} strokeWidth={1.2} className="text-ink/50" />
            </div>
          )}
          <Link href="/market" aria-label="Back to the market" className="absolute left-3 top-3 flex size-11 items-center justify-center rounded-full bg-white lg:hidden"><Icon name="back" /></Link>
        </div>

        <div className="relative -mt-5 flex flex-col gap-4 rounded-t-[22px] bg-sand px-5 pb-8 pt-5 lg:mt-0 lg:rounded-none lg:p-0">
          <Link href="/market" className="hidden text-sm font-semibold text-brand lg:block">← Student Market</Link>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {it.is_bundle && <span className="rounded-full bg-[#fff3d1] px-2.5 py-1 text-xs font-bold text-[#6b4a00]">Moving-out bundle</span>}
              <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-bold text-brand">{MARKET_CONDITIONS[it.condition]}</span>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-ink">Pickup in {it.area_name}</span>
            </div>
            {!isSeller && <MarketSaveButton itemId={it.id} saved={!!saved.data} className="size-11 border border-line" />}
          </div>
          <div>
            <h1 className="font-display text-[26px] font-bold leading-tight lg:text-3xl">{it.title}</h1>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-[30px] font-bold text-brand">{formatNaira(it.price_kobo)}</span>
              {it.original_value_kobo && <s className="text-muted">{formatNaira(it.original_value_kobo)}</s>}
            </p>
          </div>

          {it.is_bundle && it.bundle_contents.length > 0 && (
            <section className="card p-4">
              <h2 className="font-bold">In this bundle</h2>
              <ul className="mt-2 grid grid-cols-2 gap-1.5">
                {it.bundle_contents.map((c) => <li key={c} className="flex items-center gap-2 text-[15px]"><Icon name="check" size={16} className="text-brand" />{c}</li>)}
              </ul>
            </section>
          )}
          {it.description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#3f4f47]">{it.description}</p>}

          {!isSeller && (
            <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5">
              <span className="flex size-11 flex-none items-center justify-center rounded-full bg-brand font-display text-lg font-bold text-white">{it.seller_name[0]}</span>
              <div className="text-sm">
                <p className="font-bold">{it.seller_name} {it.seller_verified && <span className="ml-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-brand">ID verified</span>}</p>
                <p className="text-muted">UniAbuja student · listed {timeAgo(it.created_at)}</p>
              </div>
            </div>
          )}

          {isSeller ? (
            <section className="flex flex-col gap-3 rounded-2xl border-2 border-brand bg-white p-4">
              {sp.new && <p role="status" className="lk-in rounded-xl bg-mint p-3 text-sm font-semibold text-brand">Your item is live. Add photos so buyers can see it.</p>}
              <h2 className="text-lg font-bold">This is your listing</h2>
              <p className="text-sm text-muted">
                {it.status === "reserved" ? "A buyer has paid (or is paying) into escrow. You'll be paid when they confirm they have the item. Arrange the handover through their message or support."
                  : it.status === "sold" ? "Sold. The buyer confirmed they have it; LiveOff-K is paying you out."
                  : it.status === "removed" ? "You took this off the market."
                  : "Buyers can pay through escrow or message you to meet on campus."}
              </p>
              {it.status === "active" && <MarketPhotoUploader itemId={it.id} startOrder={photos?.length ?? 0} />}
              <div className="flex flex-col gap-2">
                <h3 className="font-bold">Messages from buyers ({requests.data?.length ?? 0})</h3>
                {(requests.data ?? []).map((r) => (
                  <div key={r.id} className="rounded-xl bg-sand p-3 text-sm">
                    <p>{r.message}</p>
                    <p className="mt-1 font-semibold">{r.contact} <span className="font-normal text-muted">· {timeAgo(r.created_at)}</span></p>
                  </div>
                ))}
              </div>
              {it.status === "active" && (
                <form action={removeItem}><input type="hidden" name="itemId" value={it.id} />
                  <button className="btn h-11 w-full border border-[#e5b4ac] bg-white text-[#a1281a]">Take it off the market</button></form>
              )}
            </section>
          ) : order ? (
            <section className="flex flex-col gap-3 rounded-2xl border-2 border-brand bg-white p-4">
              <h2 className="text-lg font-bold">You&apos;re buying this</h2>
              <Link href={`/payments/${order.id}`} className="btn-primary h-12">Track your payment</Link>
            </section>
          ) : (
            <section className="rounded-2xl border-2 border-brand bg-white p-4">
              <BuyPanel itemId={it.id} price={formatNaira(it.price_kobo)} fee={formatNaira(fee)} total={formatNaira(it.price_kobo + fee)}
                email={profile.data?.email ?? null} reserved={it.status !== "active"} />
            </section>
          )}

          <section className="flex flex-col gap-2.5 rounded-2xl bg-ink p-4 text-white">
            <h2 className="font-bold">Buy safely</h2>
            {["Pay through escrow, never to a stranger's account.", "Meet in a busy spot, like the main gate or the library.", "Check the item works before you confirm.", "Something wrong? Open a dispute and support holds the money."].map((t, k) => (
              <p key={t} className="flex items-center gap-2.5 text-[13px] text-[#cfe3d7]">
                <span className="flex size-6 flex-none items-center justify-center rounded-full bg-amber text-xs font-bold text-ink">{k + 1}</span>{t}
              </p>
            ))}
          </section>
          <Link href={`/support?market=${it.id}`} className="btn-ghost h-11">Report this item or ask support</Link>
        </div>
      </div>
    </div>
  );
}

export default function MarketItemPage(props: Props) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Content {...props} />
    </Suspense>
  );
}
