import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SellForm } from "@/components/market/SellForm";
import { PageLoading } from "@/components/PageLoading";
import { SetupNotice } from "@/components/SetupNotice";
import { SkyBand } from "@/components/welcome/SkyBand";
import { getProfile } from "@/lib/auth";
import { getPrefs } from "@/lib/prefs";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sell something" };

async function Content() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/market/sell");
  const prefs = await getPrefs();
  const supabase = await createClient();
  const { data: uni } = await supabase.from("universities").select("id").eq("slug", prefs?.uni || "uniabuja").maybeSingle();
  const { data: areas } = uni ? await supabase.from("areas").select("id, name").eq("university_id", uni.id).order("name") : { data: [] };
  return (
    <div>
      <section className="relative overflow-hidden bg-brand px-5 pb-10 pt-5 text-white lg:px-10 lg:pt-8">
        <SkyBand className="h-14" opacity="opacity-50" />
        <div className="relative mx-auto max-w-2xl">
          <Link href="/market" className="text-sm font-semibold text-on-brand">← Student Market</Link>
          <h1 className="mt-2 font-display text-3xl font-bold">Sell something</h1>
          <p className="mt-1 text-[15px] text-on-brand">Takes a minute. You add photos on the next step.</p>
        </div>
      </section>
      <div className="mx-auto -mt-5 max-w-2xl px-5 pb-10">
        <div className="card relative rounded-[32px] p-5"><SellForm areas={areas ?? []} /></div>
      </div>
    </div>
  );
}

export default function SellPage() {
  return <Suspense fallback={<PageLoading />}><Content /></Suspense>;
}
