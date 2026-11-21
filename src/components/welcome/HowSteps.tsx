"use client";

import { useState } from "react";

const STEPS = [
  { label: "Inspect", text: "Book a free inspection. Our team has already checked the room in person." },
  { label: "Pay escrow", text: "Pay into LiveOff-K escrow. The landlord can't touch it yet." },
  { label: "Move in", text: "Move in, confirm all is well, and only then is the landlord paid." },
];

/** Three tappable pills that explain the escrow flow one step at a time. */
export function HowSteps() {
  const [sel, setSel] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="How it works">
        {STEPS.map((s, i) => (
          <button key={s.label} type="button" role="tab" aria-selected={sel === i} onClick={() => setSel(i)}
            className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${sel === i ? "border-amber bg-amber text-ink" : "border-white/25 bg-white/5 text-white hover:border-amber"}`}>
            <span className="font-display font-bold">{i + 1}</span> {s.label}
          </button>
        ))}
      </div>
      <p role="tabpanel" className="min-h-10 text-sm text-white">{STEPS[sel].text}</p>
    </div>
  );
}
