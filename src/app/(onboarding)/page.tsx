import Link from "next/link";
import { Suspense } from "react";
import { LogoMark, Wordmark } from "@/components/Logo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { Scenery } from "@/components/welcome/Scenery";
import { Keke } from "@/components/welcome/Keke";
import { HowSteps } from "@/components/welcome/HowSteps";
import { Ticker } from "@/components/welcome/Ticker";
import { WaitlistCard } from "@/components/welcome/WaitlistCard";

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
    <div className="flex w-full flex-col gap-2.5">
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
            <span className="text-xs font-bold text-brand">LIVE</span>
          </>
        );
        return u.is_live ? (
          <Link key={u.slug} href={`/start/${u.slug}`} className="group flex items-center gap-3.5 rounded-2xl border-2 border-amber bg-white p-3.5 text-ink transition hover:-translate-y-[3px] hover:shadow-[0_10px_24px_oklch(0%_0_0/0.22)]">
            {inner}
            <span aria-hidden="true" className="font-bold text-brand transition-transform group-hover:translate-x-1">→</span>
          </Link>
        ) : (
          <WaitlistCard key={u.slug} slug={u.slug} name={u.name} city={u.city} abbr={abbr} />
        );
      })}
    </div>
  );
}

async function LiveTicker() {
  let rooms: number | null = null;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { count } = await supabase.from("listings_public").select("id", { count: "exact", head: true });
    rooms = count ?? null;
  }
  return (
    <Ticker lines={[
      rooms ? <><b>{rooms}</b> verified rooms near campus right now</> : <>Every room is checked in person by our team</>,
      <>Rent and every fee shown upfront, nothing extra</>,
      <>Landlords get paid only after you move in</>,
    ]} />
  );
}

export default function Welcome() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-brand text-white">
      <Scenery />
      <Keke />
      <header className="relative z-[1] flex items-center justify-between px-5 py-5 lg:px-12">
        <span className="flex items-center gap-2"><LogoMark size={32} inverse /><Wordmark inverse /></span>
        <div className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/listings" className="text-on-brand hover:text-white">Browse rooms</Link>
          <Link href="/login" className="btn bg-amber text-ink">Log in</Link>
        </div>
      </header>
      <div className="lk-in relative z-[1] flex flex-1 flex-col justify-center gap-8 px-5 pb-[140px] pt-2 lg:flex-row lg:items-center lg:justify-center lg:gap-16 lg:px-12 lg:pb-[230px]">
        <div className="flex max-w-md flex-col gap-4">
          <p className="text-sm text-on-brand">Step 1 of 2</p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] lg:text-[52px]">Where do you study?</h1>
          <p className="text-[15px] text-on-brand lg:text-lg">
            We&apos;ll show verified rooms in the areas students from your school actually live in. Your rent stays in escrow until you move in.
          </p>
          <Suspense fallback={<div className="h-[22px]" />}><LiveTicker /></Suspense>
          <div className="hidden lg:block"><HowSteps /></div>
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-[440px]">
          <Suspense fallback={<div className="h-64 w-full rounded-2xl bg-white/5" />}>
            <UniList />
          </Suspense>
          <p className="text-xs text-on-brand-dim">More Abuja campuses are coming. Tap one to get a text when it opens.</p>
        </div>
      </div>
    </div>
  );
}
