"use client";

import { useActionState, useState } from "react";
import { joinWaitlist, type WaitlistState } from "@/app/(onboarding)/actions";

/** A "coming soon" campus. Tap to leave a phone number and get a text when it opens. */
export function WaitlistCard({ slug, name, city, abbr }: { slug: string; name: string; city: string; abbr: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, { ok: false });
  const done = state.ok;
  return (
    <div className={`rounded-2xl border-2 p-3.5 text-white transition-colors ${done || open ? "border-amber bg-amber/15" : "border-white/15 bg-white/5 opacity-85 hover:opacity-100"}`}>
      <button type="button" onClick={() => !done && setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center gap-3.5 text-left">
        <span className="flex size-12 flex-none items-center justify-center rounded-xl bg-white/85 font-display text-[15px] font-bold text-ink">{abbr}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold">{name}</span>
          <span className="block text-[13px] opacity-80">{done ? "We'll text you when it opens" : city}</span>
        </span>
        <span className={`whitespace-nowrap text-xs font-bold ${done ? "lk-pop text-amber" : "text-on-brand"}`}>{done ? "ON LIST ✓" : "NOTIFY ME"}</span>
      </button>
      {open && !done && (
        <form action={action} className="lk-in mt-3 flex flex-col gap-2">
          <input type="hidden" name="uni" value={slug} />
          <div className="flex gap-2">
            <label className="sr-only" htmlFor={`phone-${slug}`}>Phone number</label>
            <input id={`phone-${slug}`} name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="0803 123 4567"
              className="field flex-1 text-ink" />
            <button type="submit" disabled={pending} className="btn bg-amber text-ink disabled:opacity-60">{pending ? "Saving…" : "Text me"}</button>
          </div>
          {state.error && <p className="text-xs text-amber">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
