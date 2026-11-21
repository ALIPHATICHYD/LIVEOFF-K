import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "./supabase/admin";

const API = "https://api.paystack.co";
const secret = () => process.env.PAYSTACK_SECRET_KEY ?? "";
export const isPaystackConfigured = () => Boolean(secret());

/** Start a Paystack checkout. Amount is in kobo. Returns the page to send the student to. */
export async function initializeTransaction(opts: { email: string; amountKobo: number; reference: string; callbackUrl: string }) {
  const res = await fetch(`${API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: opts.email,
      amount: opts.amountKobo,
      reference: opts.reference,
      callback_url: opts.callbackUrl,
      currency: "NGN",
      metadata: { purpose: "escrow" },
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(json.message ?? "Paystack initialize failed");
  return json.data.authorization_url as string;
}

export async function verifyTransaction(reference: string) {
  const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret()}` },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.status) return null;
  return json.data as { status: string; amount: number; currency: string; reference: string };
}

export function isValidSignature(rawBody: string, signature: string | null) {
  if (!signature || !secret()) return false;
  const expected = createHmac("sha512", secret()).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Mark an escrow payment as held, but only if Paystack says it succeeded for the exact
 * amount we expect. Safe to call more than once (webhook and return page both call it).
 */
export async function markPaidIfValid(reference: string, paid: { status: string; amount: number; currency: string }) {
  if (paid.status !== "success" || paid.currency !== "NGN") return false;
  const admin = createAdminClient();
  if (!admin) return false;
  const { data: payment } = await admin.from("payments").select("id, status, total_kobo").eq("reference", reference).maybeSingle();
  if (!payment || payment.status !== "pending" || Number(payment.total_kobo) !== paid.amount) return false;
  const { error } = await admin.from("payments")
    .update({ status: "held", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", payment.id).eq("status", "pending");
  return !error;
}
