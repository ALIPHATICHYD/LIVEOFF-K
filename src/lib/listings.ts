import "server-only";
import { photoUrl } from "./photos";
import { createClient } from "./supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** First photo per listing plus which ones the current user saved. */
export async function cardExtras(supabase: Supabase, ids: string[]) {
  const first = new Map<string, string>();
  const saved = new Set<string>();
  if (!ids.length) return { first, saved };
  const [{ data: photos }, { data: claims }] = await Promise.all([
    supabase.from("listing_photos").select("listing_id, storage_path").in("listing_id", ids).order("sort_order"),
    supabase.auth.getClaims(),
  ]);
  for (const p of photos ?? []) if (!first.has(p.listing_id)) first.set(p.listing_id, photoUrl(p.storage_path));
  if (claims?.claims?.sub) {
    const { data } = await supabase.from("saved_listings").select("listing_id").in("listing_id", ids);
    for (const s of data ?? []) saved.add(s.listing_id);
  }
  return { first, saved };
}
