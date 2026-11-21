"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Toggle a saved room. Returns null when signed out so the button can send the user to login. */
export async function toggleSaved(listingId: string, save: boolean): Promise<boolean | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return null;
  if (save) {
    await supabase.from("saved_listings").upsert({ user_id: uid, listing_id: listingId });
  } else {
    await supabase.from("saved_listings").delete().eq("user_id", uid).eq("listing_id", listingId);
  }
  revalidatePath("/saved");
  return save;
}
