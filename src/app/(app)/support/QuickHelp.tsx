"use client";

import { useState } from "react";

/** Instant answers to common questions, before a student opens a chat with a person. */
const FAQ = [
  { q: "Where is my money?", a: "When you pay, the money sits in LiveOff-K escrow. The landlord only gets it after you confirm you've moved in, or 48 hours after move-in if you don't report a problem. Check Payments to see the exact step." },
  { q: "The room is not as listed", a: "Don't confirm move-in. On your payment page, tap \"Hold payment and open a dispute\". The money stays frozen while our team looks into it." },
  { q: "How do I get my caution fee back?", a: "When you move out, the landlord checks the room. If there's no damage, the caution fee is returned. If there's a disagreement, message us and we'll help." },
  { q: "An agent asked me to pay them directly", a: "Don't. LiveOff-K never asks you to pay into a personal account. Report the agent below so we can investigate." },
];

export function QuickHelp() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-2">
        {FAQ.map((f, i) => (
          <button key={f.q} type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
            className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold ${open === i ? "border-brand bg-brand text-white" : "border-brand bg-white text-brand"}`}>
            {f.q}
          </button>
        ))}
      </div>
      {open !== null && (
        <div className="lk-in max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-white p-3.5 text-sm leading-relaxed shadow-sm">{FAQ[open].a}</div>
      )}
    </div>
  );
}
