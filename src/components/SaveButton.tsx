"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toggleSaved } from "@/app/(app)/saved-actions";

export function SaveButton({ listingId, saved }: { listingId: string; saved: boolean }) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={optimistic ? "Remove from saved" : "Save room"}
      aria-pressed={optimistic}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          const res = await toggleSaved(listingId, !optimistic);
          if (res === null) router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
          else router.refresh();
        })
      }
      className={`flex size-11 flex-none items-center justify-center rounded-full border border-line transition-colors ${optimistic ? "bg-[#fdecec]" : "bg-white hover:bg-sand"}`}
    >
      <svg key={String(optimistic)} className={optimistic ? "lk-pop" : ""} width="20" height="20" viewBox="0 0 24 24"
        fill={optimistic ? "#E0464E" : "none"} stroke={optimistic ? "#E0464E" : "#0F1F17"} strokeWidth="2" aria-hidden="true">
        <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
      </svg>
    </button>
  );
}
