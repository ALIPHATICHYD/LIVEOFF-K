import { SkyBand } from "@/components/welcome/SkyBand";
import { Suspense } from "react";
import { PageLoading } from "@/components/PageLoading";
import type { Metadata } from "next";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

async function LoginPageContent({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { next } = await searchParams;
  // only allow same-site relative redirects
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <div className="card overflow-hidden">
        <div className="relative h-28 overflow-hidden bg-brand">
          <SkyBand className="h-20" opacity="opacity-90" />
          <span aria-hidden="true" className="lk-float absolute left-6 top-5 text-amber">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M15 8l2 2" /></svg>
          </span>
        </div>
        <div className="p-7">
        <h1 className="font-display text-3xl font-bold">Log in or sign up</h1>
        <p className="mt-1.5 text-muted">We&apos;ll text you a code. No password needed.</p>
        <div className="mt-6"><LoginForm next={safeNext} /></div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginPageContent searchParams={searchParams} />
    </Suspense>
  );
}
