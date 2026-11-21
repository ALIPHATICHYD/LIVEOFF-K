import Link from "next/link";
import { formatNaira } from "@/lib/format";
import type { PublicListing } from "@/lib/types";

export function ListingCard({ listing, photoUrl }: { listing: PublicListing; photoUrl?: string }) {
  const fees = [
    listing.agent_fee_kobo ? `Agent fee ${formatNaira(listing.agent_fee_kobo)}` : "No agent fee",
    listing.caution_fee_kobo ? `Caution ${formatNaira(listing.caution_fee_kobo)}` : "No caution fee",
  ].join(" · ");
  return (
    <Link href={`/listings/${listing.id}`} className="card flex flex-col overflow-hidden text-ink">
      <div className="flex h-44 items-center justify-center bg-photo text-sm text-[#3f5f4e]">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- already resized on upload
          <img src={photoUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          "No photo yet"
        )}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-brand">Verified</span>
          {listing.minutes_to_gate != null && (
            <span className="text-[13px] text-muted">{listing.minutes_to_gate} min to gate</span>
          )}
        </div>
        <h3 className="text-[17px] font-bold">{listing.title}</h3>
        <p className="font-display text-[21px] font-bold">
          {formatNaira(listing.rent_per_year_kobo)} <span className="font-sans text-[13px] font-normal text-muted">per year</span>
        </p>
        <p className="text-[13px] text-muted">{fees}</p>
      </div>
    </Link>
  );
}
