import { NextResponse, type NextRequest } from "next/server";
import { isValidSignature, markPaidIfValid } from "@/lib/paystack";

/**
 * Paystack calls this when a payment succeeds. Set the URL in
 * Paystack dashboard -> Settings -> API Keys & Webhooks: https://<site>/api/paystack/webhook
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!isValidSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const event = JSON.parse(raw) as { event: string; data: { reference: string; status: string; amount: number; currency: string } };
  if (event.event === "charge.success") {
    await markPaidIfValid(event.data.reference, event.data);
  }
  return NextResponse.json({ ok: true });
}
