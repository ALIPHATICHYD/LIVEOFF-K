"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const id = z.string().uuid();

export async function confirmMovedIn(form: FormData) {
  const pid = id.parse(form.get("paymentId"));
  const supabase = await createClient();
  await supabase.rpc("confirm_moved_in", { p_payment: pid });
  revalidatePath(`/payments/${pid}`);
}

export async function approveRelease(form: FormData) {
  const pid = id.parse(form.get("paymentId"));
  const supabase = await createClient();
  await supabase.rpc("approve_release", { p_payment: pid });
  revalidatePath(`/payments/${pid}`);
}

/** Market items: buyer has the item, so release to the seller and mark it sold. */
export async function confirmItemReceived(form: FormData) {
  const pid = id.parse(form.get("paymentId"));
  const supabase = await createClient();
  await supabase.rpc("confirm_item_received", { p_payment: pid });
  revalidatePath(`/payments/${pid}`);
}

export async function openDispute(form: FormData) {
  const pid = id.parse(form.get("paymentId"));
  const reason = String(form.get("reason") ?? "").trim().slice(0, 1000) || "I have a problem with this room.";
  const supabase = await createClient();
  const { data: threadId, error } = await supabase.rpc("open_dispute", { p_payment: pid, p_reason: reason });
  if (error || !threadId) redirect(`/payments/${pid}?error=dispute`);
  redirect(`/support/${threadId}`);
}
