import Link from "next/link";
import { Suspense } from "react";
import { LogoMark, Wordmark } from "@/components/Logo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type Uni = { slug: string; name: string; short_name: string | null; city: string; is_live: boolean; areas?: { count: number }[] };

const FALLBACK: Uni[] = [{ slug: "uniabuja", name: "University of Abuja", short_name: "UniAbuja", city: "Gwagwalada", is_live: true }];

async function UniList() {
  let unis = FALLBACK;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.from("universities").select("slug, name, short_name, city, is_live, areas(count)")
      .order("is_live", { ascending: false }).order("name");
    if (data?.length) unis = data as Uni[];
  }
  return (
    <div className="flex w-full flex-col gap-2.5 lg:w-[440px]">
      {unis.map((u) => {
        const abbr = (u.short_name ?? u.name).replace(/[^A-Z]/g, "").slice(0, 2) || u.name.slice(0, 2).toUpperCase();
        const areaCount = u.areas?.[0]?.count;
        const inner = (
          <>
            <span className={`flex size-12 flex-none items-center justify-center rounded-xl font-display text-[15px] font-bold text-ink ${u.is_live ? "bg-amber" : "bg-white/85"}`}>{abbr}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">{u.name}</span>
              <span className="block text-[13px] opacity-80">{u.city}{u.is_live && areaCount ? ` · ${areaCount} areas near campus` : ""}</span>
            </span>
            <span className={`text-xs font-bold ${u.is_live ? "text-brand" : "text-[#cfe3d7]"}`}>{u.is_live ? "LIVE" : "SOON"}</span>
          </>
        );
        return u.is_live ? (
          <Link key={u.slug} href={`/start/${u.slug}`} className="flex items-center gap-3.5 rounded-2xl border-2 border-amber bg-white p-3.5 text-ink transition-transform hover:-translate-y-0.5">{inner}</Link>
        ) : (
          <div key={u.slug} aria-disabled="true" className="flex items-center gap-3.5 rounded-2xl border-2 border-white/15 bg-white/5 p-3.5 text-white opacity-75">{inner}</div>
        );
      })}
    </div>
  );
}

export default function Welcome() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-brand text-white">
      <svg width="520" height="520" viewBox="0 0 64 64" aria-hidden="true" className="pointer-events-none absolute -right-48 top-32 opacity-[0.07]"><path d="M32 6 L58 28 L52 28 L52 56 L12 56 L12 28 L6 28 Z" fill="#FFFFFF" /></svg>
      <header className="flex items-center justify-between px-5 py-5 lg:px-12">
        <span className="flex items-center gap-2"><LogoMark size={32} inverse /><Wordmark inverse /></span>
        <div className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/listings" className="text-[#cfe3d7] hover:text-white">Browse rooms</Link>
          <Link href="/login" className="btn bg-amber text-ink">Log in</Link>
        </div>
      </header>
      <div className="relative flex flex-1 flex-col gap-8 px-5 pb-10 pt-6 lg:flex-row lg:items-center lg:justify-center lg:gap-16 lg:px-12">
        <div className="flex max-w-md flex-col gap-4">
          <p className="text-sm text-[#cfe3d7]">Step 1 of 2</p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] lg:text-5xl">Where do you study?</h1>
          <p className="text-[15px] text-[#cfe3d7] lg:text-lg">
            We&apos;ll show verified rooms in the areas students from your school actually live in. Your rent stays in escrow until you move in.
          </p>
        </div>
        <Suspense fallback={<div className="h-64 w-full rounded-2xl bg-white/5 lg:w-[440px]" />}>
          <UniList />
        </Suspense>
      </div>
      <p className="px-5 pb-6 text-xs text-[#9fc4b0] lg:px-12">More Abuja campuses are coming soon.</p>
    </div>
  );
}
