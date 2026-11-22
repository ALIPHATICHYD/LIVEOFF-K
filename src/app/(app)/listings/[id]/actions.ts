"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { RATE_LIMITED, isRateLimited } from "@/lib/format";
import { isPaystackConfigured, startCheckout } from "@/lib/paystack";
import { createClient } from "@/lib/supabase/server";

export type BookState = { ok?: boolean; error?: string };

const schema = z.object({
  listingId: z.string().uuid(),
  when: z.string().min(1, "Pick a date and time"),
  note: z.string().max(500).optional(),
});

export async function bookInspection(_prev: BookState, form: FormData): Promise<BookState> {
  const parsed = schema.safeParse({
    listingId: form.get("listingId"),
    when: form.get("when"),
    note: form.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) redirect(`/login?next=/listings/${parsed.data.listingId}`);

  // datetime-local has no timezone; the platform operates in Lagos time (UTC+1, no DST).
  const when = new Date(`${parsed.data.when}:00+01:00`);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60 * 60 * 1000) {
    return { error: "Pick a time at least an hour from now" };
  }

  const { error } = await supabase.from("inspections").insert({
    listing_id: parsed.data.listingId,
    student_id: uid,
    requested_for: when.toISOString(),
    note: parsed.data.note ?? null,
  });
  if (isRateLimited(error)) return { error: RATE_LIMITED };
  if (error) return { error: "Could not book this inspection. Try again." };
  return { ok: true };
}

export type PayState = { error?: string };

/** Create the escrow record (amounts come from the database) and send the student to Paystack. */
export async function payIntoEscrow(_prev: PayState, form: FormData): Promise<PayState> {
  const listingId = z.string().uuid().safeParse(form.get("listingId"));
  const email = z.string().trim().email("Enter a valid email for your receipt").safeParse(form.get("email"));
  if (!listingId.success) return { error: "Something went wrong. Refresh and try again." };
  if (!email.success) return { error: email.error.issues[0]?.message };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect(`/login?next=/listings/${listingId.data}`);

  const { data: payment, error } = await supabase.rpc("start_escrow_payment", { p_listing: listingId.data });
  if (error || !payment) {
    const m = error?.message ?? "";
    return { error: m.includes("inspection") ? "Book an inspection before paying."
      : m.includes("full") ? "This room is fully taken. Save it and check back, or message support."
      : "Could not start the payment. Try again." };
  }
  await supabase.from("profiles").update({ email: email.data }).eq("id", uid);

  if (payment.status !== "pending") redirect(`/payments/${payment.id}`);
  if (!isPaystackConfigured()) redirect(`/payments/${payment.id}?setup=1`);

  let url: string;
  try {
    url = await startCheckout(payment, email.data);
  } catch {
    return { error: "Paystack is not responding. Try again in a minute." };
  }
  redirect(url);
}
