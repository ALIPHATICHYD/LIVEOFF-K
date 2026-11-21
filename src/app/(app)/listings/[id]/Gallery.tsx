"use client";

import { useState } from "react";
import { Icon } from "@/components/Icons";

/** Swipe-free photo carousel: arrows + dots, works on phone and desktop. */
export function Gallery({ photos, tint, title }: { photos: { url: string; caption: string | null }[]; tint: string; title: string }) {
  const [i, setI] = useState(0);
  const n = photos.length;
  return (
    <div className="relative h-64 overflow-hidden bg-photo sm:h-80 lg:h-[480px] lg:rounded-3xl" style={n ? undefined : { background: tint }}>
      {n ? (
        // eslint-disable-next-line @next/next/no-img-element -- resized on upload
        <img key={photos[i].url} src={photos[i].url} alt={photos[i].caption ?? `${title}, photo ${i + 1}`} className="lk-in size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center">
          <svg width="170" viewBox="0 0 64 52" aria-hidden="true" className="opacity-50"><path d="M32 2 L60 24 L54 24 L54 50 L10 50 L10 24 L4 24 Z" fill="#FFFFFF" /></svg>
        </div>
      )}
      {n > 1 && (
        <>
          <button type="button" aria-label="Previous photo" onClick={() => setI((i - 1 + n) % n)} className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90"><Icon name="back" /></button>
          <button type="button" aria-label="Next photo" onClick={() => setI((i + 1) % n)} className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90"><Icon name="next" /></button>
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
            {photos.map((p, k) => (
              <button key={p.url} type="button" aria-label={`Photo ${k + 1}`} onClick={() => setI(k)}
                className={`h-2 rounded-full bg-white transition-all ${k === i ? "w-6" : "w-2 opacity-60"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
