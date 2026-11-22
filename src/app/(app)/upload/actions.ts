"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { FACILITIES, PROPERTY_TYPES, nairaToKobo, RATE_LIMITED, isRateLimited } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string };

const naira = z.coerce.number().int().min(0).max(100_000_000);
const schema = z.object({
  title: z.string().trim().min(5, "Title is too short").max(120),
  areaId: z.string().uuid("Pick an area"),
  propertyType: z.enum(Object.keys(PROPERTY_TYPES) as [keyof typeof PROPERTY_TYPES]),
  bedrooms: z.coerce.number().int().min(0).max(10),
  furnished: z.boolean(),
  rent: naira.refine((n) => n > 0, "Enter the rent"),
  agentFee: naira, cautionFee: naira, otherFees: naira,
  otherFeesNote: z.string().trim().max(120).optional(),
  minMonths: z.coerce.number().int().min(1).max(36),
  spaces: z.coerce.number().int().min(1, "At least 1 student").max(200),
  availableFrom: z.string().optional(),
  minutesToGate: z.coerce.number().int().min(0).max(180).optional(),
  address: z.string().trim().min(5, "Enter the full address").max(300),
  description: z.string().trim().max(3000),
  facilities: z.array(z.enum(FACILITIES)),
});

const digits = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\D/g, "") || "0";

export async function createListing(_prev: FormState, form: FormData): Promise<FormState> {
  const profile = await getProfile();
  if (!profile || !["landlord", "agent", "admin"].includes(profile.role)) redirect("/login?next=/upload");

  const parsed = schema.safeParse({
    title: form.get("title"),
    areaId: form.get("areaId"),
    propertyType: form.get("propertyType"),
    bedrooms: form.get("bedrooms"),
    spaces: form.get("spaces") || 1,
    furnished: form.get("furnished") === "on",
    rent: digits(form.get("rent")),
    agentFee: digits(form.get("agentFee")),
    cautionFee: digits(form.get("cautionFee")),
    otherFees: digits(form.get("otherFees")),
    otherFeesNote: form.get("otherFeesNote") || undefined,
    minMonths: form.get("minMonths"),
    availableFrom: form.get("availableFrom") || undefined,
    minutesToGate: form.get("minutesToGate") || undefined,
    address: form.get("address"),
    description: form.get("description") ?? "",
    facilities: form.getAll("facilities"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: area } = await supabase.from("areas").select("university_id").eq("id", d.areaId).single();
  if (!area) return { error: "Pick an area" };

  const { data, error } = await supabase.from("listings").insert({
    owner_id: profile.id,
    university_id: area.university_id,
    area_id: d.areaId,
    title: d.title,
    description: d.description,
    property_type: d.propertyType,
    bedrooms: d.bedrooms,
    furnished: d.furnished,
    rent_per_year_kobo: nairaToKobo(d.rent),
    agent_fee_kobo: nairaToKobo(d.agentFee),
    caution_fee_kobo: nairaToKobo(d.cautionFee),
    other_fees_kobo: nairaToKobo(d.otherFees),
    other_fees_note: d.otherFeesNote ?? null,
    min_rental_months: d.minMonths,
    spaces: d.spaces,
    available_from: d.availableFrom ?? null,
    minutes_to_gate: d.minutesToGate ?? null,
    address: d.address,
    facilities: d.facilities,
  }).select("id").single();
  if (isRateLimited(error)) return { error: RATE_LIMITED };
  if (error || !data) return { error: "Could not save the listing. Try again." };
  redirect(`/upload/${data.id}`);
}

export async function submitForReview(listingId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from("listing_photos").select("id", { count: "exact", head: true }).eq("listing_id", listingId);
  if ((count ?? 0) < 3) return { error: "Add at least 3 photos first." };
  const { error } = await supabase.from("listings").update({ status: "pending_review" }).eq("id", listingId);
  if (error) return { error: "Could not submit. Try again." };
  revalidatePath(`/upload/${listingId}`);
  revalidatePath("/upload");
  return {};
}
