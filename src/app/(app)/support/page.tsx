import type { Metadata } from "next";
import Link from "next/link";
import { SkyBand } from "@/components/welcome/SkyBand";
import { Suspense } from "react";
import { PageLoading } from "@/components/PageLoading";
import { getProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { startThread } from "./actions";
import { QuickHelp } from "./QuickHelp";

export const metadata: Metadata = { title: "Support" };
const TOPICS = ["Payment or escrow", "Problem with a room", "Report an agent or landlord", "Something else"];

async function Content({ searchParams }: { searchParams: Promise<{ listing?: string; error?: string }> }) {
  const sp = await searchParams;
  const profile = isSupabaseConfigured ? await getProfile() : null;
  let threads: { id: string; subject: string; status: string; updated_at: string }[] = [];
  if (profile) {
    const supabase = await createClient();
    const { data } = await supabase.from("support_threads").select("id, subject, status, updated_at")
      .eq("user_id", profile.id).order("updated_at", { ascending: false });
    threads = data ?? [];
  }
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-5 py-6 lg:py-10">
      <div className="relative flex items-center gap-3 overflow-hidden rounded-[20px] bg-brand p-5 pb-14 text-white">
        <SkyBand className="h-12" opacity="opacity-50" />
        <span className="relative flex size-12 flex-none items-center justify-center rounded-full bg-amber font-display font-bold text-ink">
          LK<span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-brand bg-[#3bc47a]" />
        </span>
        <div className="relative">
          <h1 className="font-display text-2xl font-bold">LiveOff-K Support</h1>
          <p className="text-sm text-[#cfe3d7]">Real people. We reply as fast as we can, and we hold your rent until you&apos;re happy.</p>
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl bg-[#eef1ea] p-4">
        <div className="max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-white p-3.5 text-sm">Hi! Tap a question for a quick answer, or message us below.</div>
        <QuickHelp />
      </section>

      {threads.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-bold">Your conversations</h2>
          {threads.map((t) => (
            <Link key={t.id} href={`/support/${t.id}`} className="card flex items-center justify-between p-4 text-ink hover:border-brand">
              <span className="font-semibold">{t.subject}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${t.status === "waiting_on_user" ? "bg-amber text-ink" : t.status === "resolved" ? "bg-sand text-muted" : "bg-mint text-brand"}`}>
                {t.status === "waiting_on_user" ? "New reply" : t.status === "resolved" ? "Resolved" : "Open"}
              </span>
            </Link>
          ))}
        </section>
      )}

      <section className="card p-5">
        <h2 className="text-lg font-bold">Message us</h2>
        {profile ? (
          <form action={startThread} className="mt-3 flex flex-col gap-3">
            {sp.listing && <input type="hidden" name="listingId" value={sp.listing} />}
            <label className="flex flex-col gap-1.5 text-sm font-semibold">Topic
              <select name="subject" className="field">{TOPICS.map((t) => <option key={t}>{t}</option>)}</select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">Message
              <textarea name="message" required rows={4} maxLength={2000} className="rounded-[10px] border border-field p-3 font-medium" placeholder="Tell us what's going on" />
            </label>
            {sp.error && <p role="alert" className="text-sm text-[#a1281a]">Please type a message.</p>}
            <button className="btn-primary h-12">Send</button>
          </form>
        ) : (
          <p className="mt-2 text-muted"><Link href="/login?next=/support" className="font-semibold text-brand">Log in</Link> to chat with our team.</p>
        )}
      </section>
    </div>
  );
}

export default function SupportPage(props: { searchParams: Promise<{ listing?: string; error?: string }> }) {
  return <Suspense fallback={<PageLoading />}><Content {...props} /></Suspense>;
}
