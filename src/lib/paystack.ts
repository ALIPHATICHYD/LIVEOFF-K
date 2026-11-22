import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sendAlert } from "./alert";
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

export type ChargeOutcome =
  | "held" | "held_late" | "already_recorded" | "needs_refund" | "duplicate_charge"
  | "amount_mismatch" | "ignored" | "unknown_reference";

/**
 * Record a Paystack charge. All checks run in one locked database function (record_paystack_charge),
 * so the webhook and the return page can arrive together, Paystack can retry, and a payment made
 * after the checkout expired is either honoured or flagged for a refund. Throws if the database
 * can't be reached, so the webhook answers 500 and Paystack retries.
 */
export async function recordCharge(
  reference: string,
  paid: { status: string; amount: number; currency: string },
  source: "webhook" | "return",
): Promise<ChargeOutcome> {
  const admin = createAdminClient();
  if (!admin) throw new Error("SUPABASE_SECRET_KEY is not set");
  const { data, error } = await admin.rpc("record_paystack_charge", {
    p_reference: reference, p_status: paid.status, p_amount: paid.amount, p_currency: paid.currency, p_source: source,
  });
  if (error) throw new Error(`record_paystack_charge failed: ${error.message}`);
  const outcome = data as ChargeOutcome;
  if (outcome === "needs_refund" || outcome === "duplicate_charge" || outcome === "amount_mismatch" || outcome === "unknown_reference") {
    console.error(JSON.stringify({ level: "alert", msg: "payment needs staff review", reference, outcome, source }));
    await sendAlert(`LiveOff-K payment ${reference} needs staff review: ${outcome}. Open /admin.`);
  }
  return outcome;
}

/**
 * Send the student to Paystack. Each attempt gets its own reference ("<payment ref>-<suffix>"):
 * Paystack refuses to reuse a reference, so a student who closed the checkout can try again.
 */
export async function startCheckout(payment: { id: string; reference: string; total_kobo: number | string }, email: string) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return initializeTransaction({
    email,
    amountKobo: Number(payment.total_kobo),
    reference: `${payment.reference}-${Date.now().toString(36).toUpperCase()}`,
    callbackUrl: `${site}/payments/${payment.id}`,
  });
}
