import Link from "next/link";
import { formatNaira } from "@/lib/format";
import { MARKET_CONDITIONS, type MarketItem } from "@/lib/market";
import { ItemThumb } from "./ItemThumb";
import { MarketSaveButton } from "./MarketSaveButton";

export function MarketCard({ item, saved }: { item: MarketItem; saved: boolean }) {
  return (
    <Link href={`/market/${item.id}`} className="lk-lift group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink">
      <ItemThumb category={item.category} cover={item.cover_path} title={item.title} className="aspect-[4/3]" />
      <MarketSaveButton itemId={item.id} saved={saved} className="absolute right-2 top-2" />
      {item.status === "reserved" && <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-1 text-[11px] font-bold text-white">Reserved</span>}
      <div className="flex flex-col gap-0.5 p-3">
        <span className="font-display text-lg font-bold text-brand">{formatNaira(item.price_kobo)}</span>
        <span className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</span>
        <span className="text-xs text-muted">{item.area_name} · {MARKET_CONDITIONS[item.condition]}</span>
      </div>
    </Link>
  );
}

const BUNDLE_BG = ["#FCE3D2", "#DDEBF7", "#E6E0F5", "#FFF0BF"];

export function BundleCard({ item, index }: { item: MarketItem; index: number }) {
  const contents = item.bundle_contents.slice(0, 5).join(", ");
  return (
    <Link href={`/market/${item.id}`} className="lk-lift flex w-[270px] flex-none flex-col gap-2 rounded-2xl p-4 text-ink sm:w-auto" style={{ background: BUNDLE_BG[index % BUNDLE_BG.length] }}>
      <span className="self-start rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">Moving-out bundle</span>
      <span className="font-display text-lg font-bold leading-tight">{item.title}</span>
      <span className="line-clamp-2 text-[13px] text-[#3f4f47]">{contents} · {item.area_name}</span>
      <span className="mt-auto flex items-baseline gap-2">
        <span className="font-display text-xl font-bold text-brand">{formatNaira(item.price_kobo)}</span>
        {item.original_value_kobo && <s className="text-sm text-muted">{formatNaira(item.original_value_kobo)}</s>}
      </span>
    </Link>
  );
}
