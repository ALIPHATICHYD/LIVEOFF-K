import Link from "next/link";
import { areaTint, formatNaira } from "@/lib/format";
import type { PublicListing } from "@/lib/types";
import { SaveButton } from "./SaveButton";

export function RoomPlaceholder({ tint, large = false }: { tint: string; large?: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: tint }}>
      <svg width={large ? 170 : 120} viewBox="0 0 64 52" aria-hidden="true" className="opacity-50"><path d="M32 2 L60 24 L54 24 L54 50 L10 50 L10 24 L4 24 Z" fill="#FFFFFF" /></svg>
    </div>
  );
}

export function ListingCard({ listing, photoUrl, saved }: { listing: PublicListing; photoUrl?: string; saved: boolean }) {
  const mins = listing.minutes_to_gate ?? listing.area_minutes;
  const extras = [listing.furnished ? "Furnished" : "Unfurnished", ...listing.facilities.slice(0, 2)].join(" · ");
  return (
    <article className="lk-in overflow-hidden rounded-[20px] border border-[#e3e4da] bg-white shadow-[0_6px_18px_rgba(15,31,23,0.06)] transition-transform hover:-translate-y-0.5">
      <Link href={`/listings/${listing.id}`} className="relative block h-44">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- resized on upload
          <img src={photoUrl} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        ) : (
          <RoomPlaceholder tint={areaTint(listing.area_slug)} />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand">Verified</span>
        {mins != null && <span className="absolute bottom-3 left-3 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-semibold text-white">{mins} min to gate</span>}
      </Link>
      <div className="flex items-start gap-2.5 p-3.5">
        <Link href={`/listings/${listing.id}`} className="min-w-0 flex-1 text-ink">
          <h3 className="text-base font-bold">{listing.title}</h3>
          <p className="mt-1 font-display text-xl font-bold">{formatNaira(listing.rent_per_year_kobo)}<span className="font-sans text-xs font-normal text-muted"> /year</span></p>
          <p className="mt-0.5 truncate text-xs text-muted">{listing.area_name} · {extras}</p>
        </Link>
        <SaveButton listingId={listing.id} saved={saved} />
      </div>
    </article>
  );
}
