import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageLoading } from "@/components/PageLoading";
import { SetupNotice } from "@/components/SetupNotice";
import { requireRole } from "@/lib/auth";
import { PAYMENT_STATUS, formatNaira } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payments" };
const TONE = { amber: "bg-[#fff3d1] text-[#6b4a00]", green: "bg-mint text-brand", red: "bg-[#fdecec] text-[#a1281a]", grey: "bg-sand text-muted" };

async function Content() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const profile = await requireRole(["student", "landlord", "agent", "admin"], "/payments");
  const supabase = await createClient();
  const { data } = await supabase.from("payments")
    .select("id, status, total_kobo, created_at, student_id, market_item_id, listings(title), market_items(title)")
    .or(`student_id.eq.${profile.id},landlord_id.eq.${profile.id}`)
    .order("created_at", { ascending: false });
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-6 lg:py-10">
      <h1 className="font-display text-3xl font-bold">Payments</h1>
      {(data ?? []).map((p) => {
        const s = PAYMENT_STATUS[p.status] ?? PAYMENT_STATUS.pending;
        const title = (p.listings as unknown as { title: string } | null)?.title ?? (p.market_items as unknown as { title: string } | null)?.title ?? "Room";
        return (
          <Link key={p.id} href={`/payments/${p.id}`} className="card flex items-center justify-between gap-3 p-4 text-ink hover:border-brand">
            <div className="min-w-0">
              <p className="truncate font-bold">{title}</p>
              <p className="text-sm text-muted">{formatNaira(Number(p.total_kobo))}{p.student_id !== profile.id && (p.market_item_id ? " · you are the seller" : " · you are the landlord")}</p>
            </div>
            <span className={`flex-none rounded-full px-2.5 py-1 text-xs font-bold ${TONE[s.tone]}`}>{s.label}</span>
          </Link>
        );
      })}
      {!data?.length && (
        <div className="card p-6 text-center text-muted">
          No payments yet. When you pay for a room or a market item, you can follow every step here. <Link href="/listings" className="font-semibold text-brand">Find a room</Link>
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return <Suspense fallback={<PageLoading />}><Content /></Suspense>;
}
