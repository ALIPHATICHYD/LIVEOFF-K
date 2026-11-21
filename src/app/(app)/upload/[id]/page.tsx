import { Suspense } from "react";
import { PageLoading } from "@/components/PageLoading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SetupNotice } from "@/components/SetupNotice";
import { requireRole } from "@/lib/auth";
import { STATUS_LABEL, formatNaira } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { DocumentUploader, PhotoUploader, SubmitButton } from "./Uploaders";

async function ListingSetupPageContent({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { id } = await params;
  await requireRole(["landlord", "agent", "admin"], `/upload/${id}`);
  const supabase = await createClient();
  // RLS returns the row only to its owner or an admin
  const { data: listing } = await supabase.from("listings").select("id, title, status, rent_per_year_kobo").eq("id", id).maybeSingle();
  if (!listing) notFound();
  const [{ data: photos }, { data: docs }] = await Promise.all([
    supabase.from("listing_photos").select("id, storage_path, sort_order").eq("listing_id", id).order("sort_order"),
    supabase.from("listing_documents").select("kind").eq("listing_id", id),
  ]);
  const editable = ["draft", "rejected"].includes(listing.status);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 pb-16 pt-8">
      <Link href="/upload" className="text-sm font-semibold text-brand">← Your listings</Link>
      <div>
        <h1 className="font-display text-3xl font-bold">{listing.title}</h1>
        <p className="mt-1 text-muted">{formatNaira(listing.rent_per_year_kobo)} per year · {STATUS_LABEL[listing.status] ?? listing.status}</p>
      </div>
      <section className="card flex flex-col gap-4 p-6">
        <h2 className="text-xl font-bold">Step 2: Photos ({photos?.length ?? 0})</h2>
        {!!photos?.length && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={photoUrl(p.storage_path)} alt="" className="aspect-square w-full rounded-xl object-cover" />
            ))}
          </div>
        )}
        {editable && <PhotoUploader listingId={id} startOrder={photos?.length ?? 0} />}
      </section>
      <section className="card flex flex-col gap-4 p-6">
        <h2 className="text-xl font-bold">Step 3: Proof of ownership or authority</h2>
        <DocumentUploader listingId={id} uploaded={(docs ?? []).map((d) => d.kind)} />
      </section>
      {editable ? (
        <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="max-w-md text-sm text-muted">Step 4: Our team will contact you to inspect the property. It goes live once every check passes.</p>
          <SubmitButton listingId={id} />
        </section>
      ) : (
        <p className="card p-5 text-muted">This listing is {STATUS_LABEL[listing.status]?.toLowerCase()}. Contact support to change it.</p>
      )}
    </div>
  );
}

export default function ListingSetupPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ListingSetupPageContent params={params} />
    </Suspense>
  );
}
