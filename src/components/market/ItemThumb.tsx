import { Icon } from "@/components/Icons";
import { MARKET_CATEGORIES, marketPhotoUrl, type MarketCategory } from "@/lib/market";

/** Seller's cover photo, or a tinted category icon when there is none yet. */
export function ItemThumb({ category, cover, title, className = "", iconSize = 54 }: { category: MarketCategory; cover: string | null; title: string; className?: string; iconSize?: number }) {
  const c = MARKET_CATEGORIES[category];
  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`} style={{ background: c.tint }}>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- resized on upload
        <img src={marketPhotoUrl(cover)} alt={title} loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <Icon name={c.icon} size={iconSize} strokeWidth={1.4} className="text-ink/60" />
      )}
    </div>
  );
}
