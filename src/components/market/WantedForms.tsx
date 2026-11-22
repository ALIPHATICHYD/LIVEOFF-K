"use client";

import { useActionState, useState } from "react";
import { makeOffer, postWanted, type FormState } from "@/app/(app)/market/actions";

export function PostWanted({ universityId, areas }: { universityId: string; areas: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(postWanted, {});
  if (!open || state.ok) {
    return (
      <div className="flex items-center gap-3">
        {state.ok && <span role="status" className="lk-in text-sm font-semibold text-brand">Posted. Sellers will reach out.</span>}
        <button type="button" onClick={() => setOpen(true)} className="btn h-10 border border-[#6b4a00] bg-transparent text-sm text-[#6b4a00]">+ Post a request</button>
      </div>
    );
  }
  return (
    <form action={action} className="lk-in grid w-full gap-3 rounded-2xl bg-white p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="universityId" value={universityId} />
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">What do you need?
        <input name="text" required minLength={5} maxLength={140} className="field" placeholder="Need a reading table under ₦15k" />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Max ₦ (optional)<input name="max" inputMode="numeric" className="field" /></label>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Area
        <select name="area" defaultValue="" className="field"><option value="">Any area</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      </label>
      <button disabled={pending} className="btn-primary h-12 disabled:opacity-60">{pending ? "Posting…" : "Post"}</button>
      {state.error && <p role="alert" className="text-sm text-[#a1281a] sm:col-span-4">{state.error}</p>}
    </form>
  );
}

export function OfferButton({ wantedId }: { wantedId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(makeOffer, {});
  if (state.ok) return <span role="status" className="rounded-full bg-[#6b4a00] px-3 py-1.5 text-xs font-bold text-white">Offer sent ✓</span>;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-[#6b4a00] px-3 py-1.5 text-xs font-bold text-[#6b4a00]">I have this</button>;
  return (
    <form action={action} className="lk-in mt-2 flex w-full flex-col gap-2">
      <input type="hidden" name="wantedId" value={wantedId} />
      <input name="message" required maxLength={600} className="field" placeholder="I have one, ₦12k, in Giri" aria-label="Your offer" />
      <input name="contact" required minLength={5} maxLength={80} inputMode="tel" className="field" placeholder="Your phone or WhatsApp" aria-label="Your phone or WhatsApp" />
      {state.error && <p role="alert" className="text-xs text-[#a1281a]">{state.error}</p>}
      <button disabled={pending} className="btn-primary h-10 text-sm disabled:opacity-60">{pending ? "Sending…" : "Send offer"}</button>
    </form>
  );
}
