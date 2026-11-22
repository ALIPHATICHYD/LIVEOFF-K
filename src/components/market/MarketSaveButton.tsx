"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toggleMarketSaved } from "@/app/(app)/market/actions";

export function MarketSaveButton({ itemId, saved, className = "" }: { itemId: string; saved: boolean; className?: string }) {
  const router = useRouter();
  const [on, setOn] = useOptimistic(saved);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={on ? "Remove from saved" : "Save item"}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        start(async () => {
          setOn(!on);
          const res = await toggleMarketSaved(itemId, !on);
          if (res === null) router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
          else router.refresh();
        });
      }}
      className={`flex size-9 items-center justify-center rounded-full bg-white/95 shadow-sm ${className}`}
    >
      <span className="relative block size-[18px]">
        <svg data-on={!on} className="lk-swap absolute inset-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2" aria-hidden="true"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /></svg>
        <svg data-on={on} className="lk-swap absolute inset-0" width="18" height="18" viewBox="0 0 24 24" fill="var(--color-brand)" stroke="var(--color-brand)" strokeWidth="2" aria-hidden="true"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /></svg>
      </span>
    </button>
  );
}
