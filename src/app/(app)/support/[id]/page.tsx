import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icons";
import { PageLoading } from "@/components/PageLoading";
import { SetupNotice } from "@/components/SetupNotice";
import { requireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { sendMessage, setThreadStatus } from "../actions";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const profile = await requireRole(["student", "landlord", "agent", "admin"], `/support/${id}`);
  const supabase = await createClient();
  const [{ data: thread }, { data: messages }] = await Promise.all([
    supabase.from("support_threads").select("id, subject, status, payment_id, listing_id, user_id").eq("id", id).maybeSingle(),
    supabase.from("support_messages").select("id, body, is_staff, sender_id, created_at").eq("thread_id", id).order("created_at"),
  ]);
  if (!thread) notFound();
  const staffView = profile.role === "admin";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-2xl flex-col lg:min-h-screen">
      <header className="flex items-center gap-3 border-b border-line bg-white px-5 py-4">
        <Link href={staffView ? "/admin" : "/support"} aria-label="Back" className="flex size-10 items-center justify-center rounded-full hover:bg-sand"><Icon name="back" /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{thread.subject}</p>
          <p className="text-xs text-muted">
            {thread.payment_id && <Link href={`/payments/${thread.payment_id}`} className="font-semibold text-brand">View payment</Link>}
            {thread.payment_id && thread.listing_id && " · "}
            {thread.listing_id && <Link href={`/listings/${thread.listing_id}`} className="font-semibold text-brand">View room</Link>}
          </p>
        </div>
        <form action={setThreadStatus}>
          <input type="hidden" name="threadId" value={thread.id} />
          {staffView && <button name="status" value={thread.status === "resolved" ? "open" : "resolved"} className="btn-ghost h-9 text-sm">{thread.status === "resolved" ? "Reopen" : "Mark resolved"}</button>}
        </form>
      </header>
      <div className="flex flex-1 flex-col gap-2.5 px-4 py-4">
        {(messages ?? []).map((m) => {
          const mine = staffView ? m.is_staff : m.sender_id === profile.id;
          return (
            <div key={m.id} className={`lk-in max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${mine ? "self-end rounded-br-sm bg-brand text-white" : "self-start rounded-bl-sm bg-white"}`}>
              {!mine && m.is_staff && <span className="mb-0.5 block text-xs font-bold text-brand">LiveOff-K Support</span>}
              {m.body}
              <span className={`mt-1 block text-[10px] ${mine ? "text-[#cfe3d7]" : "text-muted"}`}>{new Date(m.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })}</span>
            </div>
          );
        })}
        {thread.status === "open" && !staffView && (
          <p className="self-center rounded-full bg-sand px-3 py-1 text-xs text-muted">We&apos;ve got your message. A team member will reply here.</p>
        )}
      </div>
      <form action={sendMessage} className="sticky bottom-24 flex gap-2 bg-sand px-4 py-3 lg:bottom-0">
        <input type="hidden" name="threadId" value={thread.id} />
        <input name="message" required maxLength={2000} aria-label="Message" placeholder="Type a message" autoComplete="off" className="h-12 min-w-0 flex-1 rounded-full border border-field bg-white px-4 text-[15px]" />
        <button aria-label="Send" className="flex size-12 flex-none items-center justify-center rounded-full bg-brand text-white"><Icon name="send" size={18} /></button>
      </form>
    </div>
  );
}

export default function ThreadPage(props: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<PageLoading />}><Content {...props} /></Suspense>;
}
