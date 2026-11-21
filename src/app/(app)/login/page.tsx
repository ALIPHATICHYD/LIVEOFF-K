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
      <div className="card p-7">
        <h1 className="font-display text-3xl font-bold">Log in or sign up</h1>
        <p className="mt-1.5 text-muted">We&apos;ll text you a code. No password needed.</p>
        <div className="mt-6"><LoginForm next={safeNext} /></div>
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
