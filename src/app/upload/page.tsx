import { Suspense } from "react";
import { PageLoading } from "@/components/PageLoading";
import type { Metadata } from "next";
import Link from "next/link";
import { SetupNotice } from "@/components/SetupNotice";
import { requireRole } from "@/lib/auth";
import { STATUS_LABEL, formatNaira } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Area } from "@/lib/types";
import { NewListingForm } from "./NewListingForm";

export const metadata: Metadata = { title: "List a property" };


async function UploadPageContent() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const profile = await requireRole(["landlord", "agent", "admin"], "/upload");
  const supabase = await createClient();
  const [{ data: areas }, { data: mine }] = await Promise.all([
    supabase.from("areas").select("id, slug, name, university_id").order("name"),
    supabase.from("listings").select("id, title, status, rent_per_year_kobo").eq("owner_id", profile.id).order("created_at", { ascending: false }),
  ]);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 pb-16 pt-8">
      <div>
        <h1 className="font-display text-4xl font-bold">List a property</h1>
        <p className="mt-1.5 text-muted">For landlords, caretakers and agents. Your listing goes live only after our team inspects it.</p>
      </div>
      {!!mine?.length && (
        <section className="card p-5">
          <h2 className="font-bold">Your listings</h2>
          <ul className="mt-3 divide-y divide-line">
            {mine.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/upload/${l.id}`} className="font-semibold text-brand">{l.title}</Link>
                <span className="text-sm text-muted">{formatNaira(l.rent_per_year_kobo)} · {STATUS_LABEL[l.status] ?? l.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <NewListingForm areas={(areas ?? []) as Area[]} />
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <UploadPageContent  />
    </Suspense>
  );
}
