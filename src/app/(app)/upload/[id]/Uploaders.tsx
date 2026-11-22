"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { compressImage } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import { submitForReview } from "../actions";

export function PhotoUploader({ listingId, startOrder }: { listingId: string; startOrder: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError(null);
    const supabase = createClient();
    let order = startOrder;
    for (const file of Array.from(files).slice(0, 12)) {
      try {
        const blob = await compressImage(file);
        const path = `${listingId}/${crypto.randomUUID()}.webp`;
        const up = await supabase.storage.from("listing-photos").upload(path, blob, { contentType: "image/webp" });
        if (up.error) throw up.error;
        const row = await supabase.from("listing_photos").insert({ listing_id: listingId, storage_path: path, sort_order: order++ });
        if (row.error) throw row.error;
      } catch {
        setError(`Could not upload ${file.name}.`);
      }
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-field bg-sand p-6 text-center">
      <span className="font-bold">{busy ? "Uploading…" : "Add photos"}</span>
      <span className="text-sm text-muted">Room, bathroom, kitchen, compound and street. They are resized automatically.</span>
      <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => onFiles(e.target.files)} />
      {error && <span role="alert" className="text-sm text-danger">{error}</span>}
    </label>
  );
}

const DOC_KINDS = { owner_id: "Landlord's ID", authority_letter: "Signed authority letter (agents)", ownership_proof: "Proof of ownership" } as const;

export function DocumentUploader({ listingId, uploaded }: { listingId: string; uploaded: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(kind: keyof typeof DOC_KINDS, file: File | undefined) {
    if (!file) return;
    setBusy(kind); setError(null);
    const supabase = createClient();
    const isPdf = file.type === "application/pdf";
    const body = isPdf ? file : await compressImage(file, 2000, 0.85);
    const path = `${listingId}/${kind}-${crypto.randomUUID()}.${isPdf ? "pdf" : "webp"}`;
    const up = await supabase.storage.from("listing-documents").upload(path, body, { contentType: isPdf ? "application/pdf" : "image/webp" });
    const row = up.error ? up : await supabase.from("listing_documents").insert({ listing_id: listingId, kind, storage_path: path });
    setBusy(null);
    if (row.error) setError("Upload failed. Try again.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {(Object.keys(DOC_KINDS) as (keyof typeof DOC_KINDS)[]).map((k) => (
        <label key={k} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
          <span className="text-[15px]">{DOC_KINDS[k]} {uploaded.includes(k) && <span className="text-sm font-semibold text-brand">· uploaded</span>}</span>
          <span className="btn-ghost h-9 cursor-pointer text-sm">{busy === k ? "Uploading…" : "Choose file"}
            <input type="file" accept="image/*,application/pdf" className="sr-only" disabled={!!busy} onChange={(e) => onFile(k, e.target.files?.[0])} />
          </span>
        </label>
      ))}
      <p className="text-xs text-muted">Documents are private. Only LiveOff-K staff can see them.</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function SubmitButton({ listingId }: { listingId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-2">
      <button disabled={pending} onClick={() => start(async () => setError((await submitForReview(listingId)).error ?? null))} className="btn-primary h-12 px-7 disabled:opacity-60">
        {pending ? "Submitting…" : "Request inspection and review"}
      </button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
