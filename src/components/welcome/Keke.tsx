"use client";

import { useState } from "react";

const CALLS = ["Giri, Giri, Giri!", "Gate in 5 min!", "Oya, enter!"];

/** A keke that drives along the road. Click it and it calls out a stop. */
export function Keke() {
  const [n, setN] = useState(0);
  return (
    <button type="button" onClick={() => setN((c) => c + 1)} aria-label="Keke to campus"
      className="lk-keke absolute bottom-3.5 z-[2] border-0 bg-transparent p-0 lg:bottom-6">
      <span aria-live="polite"
        className={`absolute bottom-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-white px-2.5 py-1.5 text-xs font-semibold text-ink transition-opacity ${n ? "opacity-100" : "opacity-0"}`}>
        {n ? CALLS[(n - 1) % CALLS.length] : ""}
      </span>
      <svg width="64" height="40" viewBox="0 0 64 40" aria-hidden="true">
        <path d="M8 26 L12 8 Q14 4 20 4 L44 4 Q50 4 52 10 L58 26Z" fill="#F2A900" />
        <rect x="18" y="8" width="12" height="10" rx="2" fill="#CFE3D7" />
        <rect x="34" y="8" width="12" height="10" rx="2" fill="#CFE3D7" />
        <rect x="4" y="24" width="56" height="6" rx="3" fill="#0F1F17" />
        <circle cx="16" cy="32" r="6" fill="#0F1F17" /><circle cx="16" cy="32" r="2.4" fill="#CFE3D7" />
        <circle cx="50" cy="32" r="6" fill="#0F1F17" /><circle cx="50" cy="32" r="2.4" fill="#CFE3D7" />
      </svg>
    </button>
  );
}
