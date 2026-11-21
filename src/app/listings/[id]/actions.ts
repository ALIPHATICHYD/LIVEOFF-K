"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
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
  if (error) return { error: "Could not book this inspection. Try again." };
  return { ok: true };
}
