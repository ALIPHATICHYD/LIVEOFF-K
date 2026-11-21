import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageLoading } from "@/components/PageLoading";
import { SetupNotice } from "@/components/SetupNotice";
import { BUDGETS, getPrefs } from "@/lib/prefs";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { AreaPicker } from "./AreaPicker";

async function Content({ params }: { params: Promise<{ uni: string }> }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { uni } = await params;
  const supabase = await createClient();
  const { data: university } = await supabase.from("universities").select("id, slug, name, short_name, is_live").eq("slug", uni).maybeSingle();
  if (!university?.is_live) notFound();
  const [{ data: areas }, { data: rents }, prefs] = await Promise.all([
    supabase.from("areas").select("slug, name, minutes_to_campus, map_x, map_y").eq("university_id", university.id).order("sort_order"),
    supabase.from("listings_public").select("area_slug, rent_per_year_kobo").eq("university_slug", uni),
    getPrefs(),
  ]);
  const points = (areas ?? []).map((a, i) => ({
    slug: a.slug, name: a.name, minutes: a.minutes_to_campus,
    // spread areas without coordinates around the edge
    x: a.map_x ?? (10 + (i * 37) % 70), y: a.map_y ?? (10 + (i * 53) % 75),
  }));
  return (
    <AreaPicker
      uni={uni}
      uniName={university.short_name ?? university.name}
      areas={points}
      rents={(rents ?? []).map((r) => ({ area: r.area_slug, rent: Number(r.rent_per_year_kobo) / 100 }))}
      budgets={BUDGETS}
      initial={prefs?.uni === uni ? { areas: prefs.areas, budget: prefs.budget } : { areas: [], budget: "any" }}
    />
  );
}

export default function StartPage({ params }: { params: Promise<{ uni: string }> }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Content params={params} />
    </Suspense>
  );
}
