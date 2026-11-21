"use client";

import { useActionState } from "react";
import { payIntoEscrow, type PayState } from "./actions";

export function PayForm({ listingId, total, email }: { listingId: string; total: string; email: string | null }) {
  const [state, action, pending] = useActionState<PayState, FormData>(payIntoEscrow, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="listingId" value={listingId} />
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Email for your receipt
        <input name="email" type="email" required defaultValue={email ?? ""} autoComplete="email" className="field" />
      </label>
      {state.error && <p role="alert" className="text-sm text-[#a1281a]">{state.error}</p>}
      <button disabled={pending} className="btn-primary h-13 rounded-[14px] text-base disabled:opacity-60">
        {pending ? "Opening Paystack…" : `Pay ${total} into escrow`}
      </button>
    </form>
  );
}
