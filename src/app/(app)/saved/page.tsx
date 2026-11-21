import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListingCard } from "@/components/ListingCard";
import { PageLoading } from "@/components/PageLoading";
import { SetupNotice } from "@/components/SetupNotice";
import { requireRole } from "@/lib/auth";
import { cardExtras } from "@/lib/listings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { PublicListing } from "@/lib/types";

export const metadata: Metadata = { title: "Saved rooms" };

async function Content() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const profile = await requireRole(["student", "landlord", "agent", "admin"], "/saved");
  const supabase = await createClient();
  const { data: rows } = await supabase.from("saved_listings").select("listing_id").eq("user_id", profile.id).order("created_at", { ascending: false });
  const ids = (rows ?? []).map((r) => r.listing_id);
  const { data } = ids.length ? await supabase.from("listings_public").select("*").in("id", ids) : { data: [] };
  const listings = (data ?? []) as PublicListing[];
  const { first } = await cardExtras(supabase, ids);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 lg:px-10 lg:py-10">
      <h1 className="font-display text-3xl font-bold">Saved rooms</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:gap-5">
        {listings.map((l) => <ListingCard key={l.id} listing={l} photoUrl={first.get(l.id)} saved />)}
      </div>
      {!listings.length && (
        <div className="card p-6 text-center text-muted">Tap the heart on a room to save it here. <Link href="/listings" className="font-semibold text-brand">Browse rooms</Link></div>
      )}
    </div>
  );
}

export default function SavedPage() {
  return <Suspense fallback={<PageLoading />}><Content /></Suspense>;
}
