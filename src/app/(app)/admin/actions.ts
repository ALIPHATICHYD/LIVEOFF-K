"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { VERIFICATION_CHECKS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/** Approve only when every check in section 9 passed. Records who checked what. */
export async function reviewListing(form: FormData) {
  const admin = await requireRole(["admin"], "/admin");
  const listingId = String(form.get("listingId"));
  const decision = String(form.get("decision"));
  const supabase = await createClient();

  if (decision === "reject") {
    await supabase.from("listings").update({ status: "rejected" }).eq("id", listingId);
  } else if (decision === "inspect") {
    await supabase.from("listings").update({ status: "inspection_scheduled" }).eq("id", listingId);
  } else if (decision === "approve") {
    const rows = VERIFICATION_CHECKS.map((c) => ({
      listing_id: listingId, check_key: c.key, label: c.label,
      passed: form.get(`check_${c.key}`) === "on", checked_by: admin.id,
    }));
    await supabase.from("verification_checks").upsert(rows, { onConflict: "listing_id,check_key" });
    if (rows.every((r) => r.passed)) {
      await supabase.from("listings")
        .update({ status: "verified", verified_at: new Date().toISOString(), verified_by: admin.id })
        .eq("id", listingId);
    }
  }
  revalidatePath("/admin");
}

export async function updateComplaint(form: FormData) {
  await requireRole(["admin"], "/admin");
  const supabase = await createClient();
  const status = String(form.get("status"));
  if (!["investigating", "resolved", "dismissed"].includes(status)) return;
  await supabase.from("complaints").update({ status }).eq("id", String(form.get("id")));
  revalidatePath("/admin");
}

export async function suspendListing(form: FormData) {
  await requireRole(["admin"], "/admin");
  const supabase = await createClient();
  await supabase.from("listings").update({ status: "suspended" }).eq("id", String(form.get("listingId")));
  revalidatePath("/admin");
}

/**
 * Staff record the payout after sending money to the landlord (bank transfer or Paystack Transfer).
 * Allowed once the student confirmed, or 48 hours after move-in with no dispute.
 */
export async function markReleased(form: FormData) {
  await requireRole(["admin"], "/admin");
  const supabase = await createClient();
  const id = String(form.get("paymentId"));
  const payoutReference = String(form.get("payoutReference") ?? "").trim().slice(0, 120);
  if (!payoutReference) return;
  const { data: p } = await supabase.from("payments").select("status, release_due_at").eq("id", id).single();
  const due = p?.status === "moved_in" && p.release_due_at && new Date(p.release_due_at) < new Date();
  if (p?.status !== "release_approved" && !due) return;
  await supabase.from("payments")
    .update({ status: "released", released_at: new Date().toISOString(), payout_reference: payoutReference, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin");
}

export async function markRefunded(form: FormData) {
  await requireRole(["admin"], "/admin");
  const supabase = await createClient();
  await supabase.from("payments")
    .update({ status: "refunded", refunded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", String(form.get("paymentId"))).in("status", ["held", "moved_in", "disputed"]);
  revalidatePath("/admin");
}
