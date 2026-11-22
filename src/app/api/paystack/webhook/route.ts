import { NextResponse, type NextRequest } from "next/server";
import { isValidSignature, recordCharge } from "@/lib/paystack";

/**
 * Paystack calls this when a payment succeeds. Set the URL in
 * Paystack dashboard -> Settings -> API Keys & Webhooks: https://<site>/api/paystack/webhook
 *
 * Answers 200 only once the charge is safely recorded. Any other answer makes Paystack retry,
 * and recording is idempotent, so retries are safe.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!isValidSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string; status?: string; amount?: number; currency?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const d = event.data;
  if (event.event !== "charge.success" || !d?.reference) return NextResponse.json({ ok: true, ignored: true });

  try {
    const outcome = await recordCharge(d.reference, { status: d.status ?? "", amount: Number(d.amount), currency: d.currency ?? "" }, "webhook");
    return NextResponse.json({ ok: true, outcome });
  } catch (err) {
    console.error(JSON.stringify({ level: "error", msg: "paystack webhook failed", reference: d.reference, error: String(err) }));
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
