"use client";

import { useActionState } from "react";
import { bookInspection, type BookState } from "./actions";

export function BookInspection({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<BookState, FormData>(bookInspection, {});
  if (state.ok) {
    return (
      <p className="rounded-[10px] bg-mint p-3 text-sm text-brand">
        Inspection requested. The landlord or agent will confirm the time and share the address with you.
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="listingId" value={listingId} />
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Preferred date and time
        <input type="datetime-local" name="when" required className="field" />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Note (optional)
        <input name="note" maxLength={500} placeholder="e.g. I can come after 2pm lectures" className="field" />
      </label>
      {state.error && <p role="alert" className="text-sm text-[#a1281a]">{state.error}</p>}
      <button disabled={pending} className="btn-primary h-12 disabled:opacity-60">
        {pending ? "Booking…" : "Book free inspection"}
      </button>
    </form>
  );
}
