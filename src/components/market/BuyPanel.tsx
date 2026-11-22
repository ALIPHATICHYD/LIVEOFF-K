"use client";

import { useActionState, useState } from "react";
import { buyItem, sendMeetRequest, type FormState } from "@/app/(app)/market/actions";

const MODES = [
  { id: "escrow", title: "Pay through escrow (recommended)", text: "Your money is held until you confirm you have the item. If it isn't as described, support refunds you." },
  { id: "meet", title: "Meet on campus and pay in person", text: "Meet at a safe spot, like the main gate or the library. No buyer protection." },
] as const;

export function BuyPanel({ itemId, price, fee, total, email, reserved }: { itemId: string; price: string; fee: string; total: string; email: string | null; reserved: boolean }) {
  const [mode, setMode] = useState<"escrow" | "meet">("escrow");
  const [buyState, buy, buying] = useActionState<FormState, FormData>(buyItem, {});
  const [meetState, meet, sending] = useActionState<FormState, FormData>(sendMeetRequest, {});

  if (reserved) {
    return <p className="rounded-xl bg-sand p-3 text-sm text-muted">Another student is paying for this right now. If they don&apos;t finish within 30 minutes, it goes back on sale.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">How do you want to pay?</h2>
      <div role="radiogroup" className="flex flex-col gap-2">
        {MODES.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)}
            className={`flex gap-3 rounded-2xl border-2 bg-white p-3.5 text-left transition-colors ${mode === m.id ? "border-brand" : "border-line"}`}>
            <span className={`mt-0.5 flex size-5 flex-none items-center justify-center rounded-full border-2 ${mode === m.id ? "border-brand" : "border-field"}`}>
              {mode === m.id && <span className="size-2.5 rounded-full bg-brand" />}
            </span>
            <span><span className="block font-bold">{m.title}</span><span className="text-[13px] text-muted">{m.text}</span></span>
          </button>
        ))}
      </div>

      {mode === "escrow" ? (
        <form action={buy} className="flex flex-col gap-3">
          <input type="hidden" name="itemId" value={itemId} />
          <div className="rounded-xl bg-sand p-3 text-sm">
            <div className="flex justify-between"><span>Item</span><span>{price}</span></div>
            <div className="flex justify-between text-muted"><span>Buyer protection</span><span>{fee}</span></div>
            <div className="mt-1.5 flex justify-between border-t border-line pt-1.5 font-bold"><span>Total</span><span>{total}</span></div>
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Email for your receipt
            <input name="email" type="email" required defaultValue={email ?? ""} autoComplete="email" className="field" />
          </label>
          {buyState.error && <p role="alert" className="text-sm text-[#a1281a]">{buyState.error}</p>}
          <button disabled={buying} className="btn-primary h-13 rounded-[14px] text-base disabled:opacity-60">{buying ? "Opening Paystack…" : `Pay ${total} into escrow`}</button>
        </form>
      ) : meetState.ok ? (
        <p role="status" className="lk-in rounded-xl bg-mint p-3 text-sm font-semibold text-brand">Sent. The seller will contact you to agree a time and place. Meet somewhere busy and check the item before you pay.</p>
      ) : (
        <form action={meet} className="flex flex-col gap-3">
          <input type="hidden" name="itemId" value={itemId} />
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Message to the seller
            <textarea name="message" required rows={3} maxLength={600} defaultValue="Hi, is this still available? I can meet at the main gate." className="rounded-[10px] border border-field p-3 font-medium" />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Your phone or WhatsApp
            <input name="contact" required minLength={5} maxLength={80} inputMode="tel" autoComplete="tel" className="field" placeholder="0801 234 5678" />
          </label>
          {meetState.error && <p role="alert" className="text-sm text-[#a1281a]">{meetState.error}</p>}
          <button disabled={sending} className="btn-primary h-12 disabled:opacity-60">{sending ? "Sending…" : "Message seller"}</button>
          <p className="text-xs text-muted">Only the seller sees your number.</p>
        </form>
      )}
    </div>
  );
}
