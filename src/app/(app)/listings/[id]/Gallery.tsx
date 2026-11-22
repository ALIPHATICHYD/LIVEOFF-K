"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icons";

/**
 * Photo carousel. Swipe on phones (native scroll-snap, so it rubber-bands at the ends and can be
 * reversed mid-swipe), arrows and dots on desktop.
 */
export function Gallery({ photos, tint, title }: { photos: { url: string; caption: string | null }[]; tint: string; title: string }) {
  const [i, setI] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const n = photos.length;

  const go = (k: number) => {
    const el = track.current;
    if (!el) return;
    const next = (k + n) % n;
    el.scrollTo({ left: next * el.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const onScroll = () => {
    const el = track.current;
    if (el) setI(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
  };

  return (
    <div className="relative h-64 overflow-hidden bg-photo sm:h-80 lg:h-[480px] lg:rounded-3xl" style={n ? undefined : { background: tint }}>
      {n ? (
        <div ref={track} onScroll={onScroll} aria-roledescription="carousel" aria-label={`${title} photos`}
          className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
          {photos.map((p, k) => (
            // eslint-disable-next-line @next/next/no-img-element -- resized on upload
            <img key={p.url} src={p.url} alt={p.caption ?? `${title}, photo ${k + 1}`} loading={k === 0 ? "eager" : "lazy"}
              className="size-full flex-none snap-center object-cover" />
          ))}
        </div>
      ) : (
        <div className="flex size-full items-center justify-center">
          <svg width="170" viewBox="0 0 64 52" aria-hidden="true" className="opacity-50"><path d="M32 2 L60 24 L54 24 L54 50 L10 50 L10 24 L4 24 Z" fill="white" /></svg>
        </div>
      )}
      {n > 1 && (
        <>
          <button type="button" aria-label="Previous photo" onClick={() => go(i - 1)} className="btn absolute left-3 top-1/2 size-11 -translate-y-1/2 rounded-full bg-white/90 p-0 max-sm:hidden"><Icon name="back" /></button>
          <button type="button" aria-label="Next photo" onClick={() => go(i + 1)} className="btn absolute right-3 top-1/2 size-11 -translate-y-1/2 rounded-full bg-white/90 p-0 max-sm:hidden"><Icon name="next" /></button>
          <div className="absolute inset-x-0 bottom-2 flex justify-center">
            {photos.map((p, k) => (
              // 24px tap target around an 8px dot
              <button key={p.url} type="button" aria-label={`Photo ${k + 1}`} aria-current={k === i} onClick={() => go(k)} className="flex h-6 items-center px-1">
                <span className={`block h-2 rounded-full bg-white transition-[width,opacity] duration-200 ${k === i ? "w-6" : "w-2 opacity-60"}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
