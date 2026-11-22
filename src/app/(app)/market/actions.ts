"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MARKET_CATEGORIES, MARKET_CONDITIONS } from "@/lib/market";
import { initializeTransaction, isPaystackConfigured } from "@/lib/paystack";
import { createClient } from "@/lib/supabase/server";

export type FormState = { ok?: boolean; error?: string };

async function signedIn(next: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, uid };
}

const naira = z.coerce.number({ message: "Enter a price in naira" }).int("Use whole naira").min(100, "Price must be at least ₦100").max(5_000_000, "Price is too high");
const sellSchema = z.object({
  title: z.string().trim().min(3, "Give the item a short title").max(100),
  description: z.string().trim().max(1500).default(""),
  category: z.enum(Object.keys(MARKET_CATEGORIES) as [string, ...string[]], { message: "Pick a category" }),
  condition: z.enum(Object.keys(MARKET_CONDITIONS) as [string, ...string[]], { message: "Pick a condition" }),
  price: naira,
  area: z.string().uuid("Pick a pickup area"),
  bundle: z.boolean(),
  contents: z.array(z.string().trim().min(1).max(60)).max(20),
  was: z.union([naira, z.literal(0)]).optional(),
});

/** List an item for sale, then send the seller to the item page to add photos. */
export async function createItem(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = sellSchema.safeParse({
    title: form.get("title"),
    description: form.get("description") ?? "",
    category: form.get("category"),
    condition: form.get("condition"),
    price: String(form.get("price") ?? "").replace(/[^\d]/g, ""),
    area: form.get("area"),
    bundle: form.get("bundle") === "1",
    contents: String(form.get("contents") ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
    was: String(form.get("was") ?? "").replace(/[^\d]/g, "") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const d = parsed.data;
  if (d.bundle && d.contents.length < 2) return { error: "List at least two things in the bundle" };

  const { supabase, uid } = await signedIn("/market/sell");
  const { data: area } = await supabase.from("areas").select("id, university_id").eq("id", d.area).maybeSingle();
  if (!area) return { error: "Pick a pickup area" };

  const { data: item, error } = await supabase.from("market_items").insert({
    seller_id: uid,
    university_id: area.university_id,
    area_id: area.id,
    category: d.category,
    condition: d.condition,
    title: d.title,
    description: d.description,
    price_kobo: d.price * 100,
    is_bundle: d.bundle,
    bundle_contents: d.bundle ? d.contents : [],
    original_value_kobo: d.bundle && d.was && d.was > d.price ? d.was * 100 : null,
  }).select("id").single();
  if (error || !item) return { error: "Could not list this item. Try again." };
  revalidatePath("/market");
  redirect(`/market/${item.id}?new=1`);
}

const uuid = z.string().uuid();

/** Start (or reuse) the escrow order for an item and send the buyer to Paystack. Price comes from the database. */
export async function buyItem(_prev: FormState, form: FormData): Promise<FormState> {
  const itemId = uuid.safeParse(form.get("itemId"));
  const email = z.string().trim().email("Enter a valid email for your receipt").safeParse(form.get("email"));
  if (!itemId.success) return { error: "Something went wrong. Refresh and try again." };
  if (!email.success) return { error: email.error.issues[0]?.message };

  const { supabase, uid } = await signedIn(`/market/${itemId.data}`);
  const { data: payment, error } = await supabase.rpc("start_market_payment", { p_item: itemId.data });
  if (error || !payment) {
    const m = error?.message ?? "";
    return { error: m.includes("reserved") ? "Someone else is paying for this right now. Check back in 30 minutes."
      : m.includes("own item") ? "This is your own item." : "This item is no longer available." };
  }
  await supabase.from("profiles").update({ email: email.data }).eq("id", uid);

  if (payment.status !== "pending") redirect(`/payments/${payment.id}`);
  if (!isPaystackConfigured()) redirect(`/payments/${payment.id}?setup=1`);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let url: string;
  try {
    url = await initializeTransaction({
      email: email.data,
      amountKobo: Number(payment.total_kobo),
      reference: payment.reference,
      callbackUrl: `${site}/payments/${payment.id}`,
    });
  } catch {
    return { error: "Paystack is not responding. Try again in a minute." };
  }
  redirect(url);
}

const contactSchema = z.object({
  message: z.string().trim().min(1, "Write a short message").max(600),
  contact: z.string().trim().min(5, "Add a phone number or WhatsApp so they can reach you").max(80),
});

/** "Meet on campus": leave the seller a message and a way to reach you. */
export async function sendMeetRequest(_prev: FormState, form: FormData): Promise<FormState> {
  const itemId = uuid.safeParse(form.get("itemId"));
  const parsed = contactSchema.safeParse({ message: form.get("message"), contact: form.get("contact") });
  if (!itemId.success) return { error: "Something went wrong. Refresh and try again." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { supabase, uid } = await signedIn(`/market/${itemId.data}`);
  const { error } = await supabase.from("market_requests").insert({ item_id: itemId.data, buyer_id: uid, ...parsed.data });
  if (error?.code === "23505") return { ok: true }; // already sent
  if (error) return { error: "Could not send. The item may be reserved or sold." };
  return { ok: true };
}

/** Seller takes an item off the market. */
export async function removeItem(form: FormData) {
  const itemId = uuid.parse(form.get("itemId"));
  const { supabase } = await signedIn(`/market/${itemId}`);
  await supabase.from("market_items").update({ status: "removed" }).eq("id", itemId).eq("status", "active");
  revalidatePath("/market");
  redirect("/market/mine");
}

/** Toggle a saved item. Returns null when signed out so the button can send the user to login. */
export async function toggleMarketSaved(itemId: string, save: boolean): Promise<boolean | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid || !uuid.safeParse(itemId).success) return null;
  if (save) await supabase.from("market_saved").upsert({ user_id: uid, item_id: itemId });
  else await supabase.from("market_saved").delete().eq("user_id", uid).eq("item_id", itemId);
  return save;
}

const wantedSchema = z.object({
  text: z.string().trim().min(5, "Say what you're looking for").max(140),
  max: z.union([naira, z.literal(0)]),
  area: z.union([z.string().uuid(), z.literal("")]),
});

export async function postWanted(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = wantedSchema.safeParse({
    text: form.get("text"),
    max: String(form.get("max") ?? "").replace(/[^\d]/g, "") || 0,
    area: form.get("area") ?? "",
  });
  const uni = uuid.safeParse(form.get("universityId"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!uni.success) return { error: "Something went wrong. Refresh and try again." };
  const { supabase, uid } = await signedIn("/market#wanted");
  const { error } = await supabase.from("market_wanted").insert({
    user_id: uid, university_id: uni.data, text: parsed.data.text,
    area_id: parsed.data.area || null, max_price_kobo: parsed.data.max ? parsed.data.max * 100 : null,
  });
  if (error) return { error: "Could not post. Try again." };
  revalidatePath("/market");
  return { ok: true };
}

export async function makeOffer(_prev: FormState, form: FormData): Promise<FormState> {
  const wantedId = uuid.safeParse(form.get("wantedId"));
  const parsed = contactSchema.safeParse({ message: form.get("message"), contact: form.get("contact") });
  if (!wantedId.success) return { error: "Something went wrong. Refresh and try again." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { supabase, uid } = await signedIn("/market#wanted");
  const { error } = await supabase.from("market_offers").insert({ wanted_id: wantedId.data, seller_id: uid, ...parsed.data });
  if (error?.code === "23505") return { ok: true }; // already sent
  if (error) return { error: "Could not send. You can't offer on your own request." };
  return { ok: true };
}

export async function closeWanted(form: FormData) {
  const wantedId = uuid.parse(form.get("wantedId"));
  const { supabase } = await signedIn("/market/mine");
  await supabase.from("market_wanted").update({ is_open: false }).eq("id", wantedId);
  revalidatePath("/market");
  revalidatePath("/market/mine");
}
