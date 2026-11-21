"use server";

import { redirect } from "next/navigation";
import { BUDGETS, setPrefs, type BudgetId } from "@/lib/prefs";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function savePrefs(form: FormData) {
  const uni = String(form.get("uni") ?? "").slice(0, 40);
  const areas = form.getAll("area").map(String).filter((a) => /^[a-z0-9-]{1,40}$/.test(a)).slice(0, 20);
  const raw = String(form.get("budget") ?? "any");
  const budget = (BUDGETS.some((b) => b.id === raw) ? raw : "any") as BudgetId;
  await setPrefs({ uni, areas, budget });
  redirect("/listings");
}

export type WaitlistState = { ok: boolean; error?: string };

/** Normalise a Nigerian mobile number to +234XXXXXXXXXX, or null if it isn't one. */
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[\s()-]/g, "");
  const m = digits.match(/^(?:\+?234|0)([789][01]\d{8})$/);
  return m ? `+234${m[1]}` : null;
}

export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  const phone = normalisePhone(String(form.get("phone") ?? ""));
  if (!phone) return { ok: false, error: "Enter a Nigerian mobile number, like 0803 123 4567." };
  if (!isSupabaseConfigured) return { ok: true };
  const slug = String(form.get("uni") ?? "").slice(0, 40);
  const supabase = await createClient();
  const { data: uni } = await supabase.from("universities").select("id, is_live").eq("slug", slug).maybeSingle();
  if (!uni || uni.is_live) return { ok: false, error: "That campus isn't taking sign-ups." };
  const { error } = await supabase.from("campus_waitlist").insert({ university_id: uni.id, phone });
  if (error && error.code !== "23505") return { ok: false, error: "Couldn't save that. Try again." };
  return { ok: true };
}
