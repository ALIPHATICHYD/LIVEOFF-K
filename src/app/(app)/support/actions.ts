"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const body = z.string().trim().min(1, "Type a message").max(2000);

export async function startThread(form: FormData) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect("/login?next=/support");
  const subject = z.string().trim().min(2).max(120).catch("Question").parse(form.get("subject"));
  const message = body.safeParse(form.get("message"));
  if (!message.success) redirect("/support?error=empty");
  const listing = z.string().uuid().safeParse(form.get("listingId"));
  const { data: thread } = await supabase.from("support_threads")
    .insert({ user_id: uid, subject, listing_id: listing.success ? listing.data : null })
    .select("id").single();
  if (!thread) redirect("/support?error=failed");
  await supabase.from("support_messages").insert({ thread_id: thread.id, sender_id: uid, body: message.data });
  redirect(`/support/${thread.id}`);
}

export async function sendMessage(form: FormData) {
  const threadId = z.string().uuid().parse(form.get("threadId"));
  const message = body.safeParse(form.get("message"));
  if (!message.success) return;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect(`/login?next=/support/${threadId}`);
  await supabase.from("support_messages").insert({ thread_id: threadId, sender_id: uid, body: message.data });
  revalidatePath(`/support/${threadId}`);
}

export async function setThreadStatus(form: FormData) {
  const threadId = z.string().uuid().parse(form.get("threadId"));
  const status = z.enum(["open", "resolved"]).parse(form.get("status"));
  const supabase = await createClient();
  await supabase.from("support_threads").update({ status }).eq("id", threadId);
  revalidatePath(`/support/${threadId}`);
}
