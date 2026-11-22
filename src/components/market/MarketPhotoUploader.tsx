"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { compressImage } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";

export function MarketPhotoUploader({ itemId, startOrder }: { itemId: string; startOrder: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const left = Math.max(0, 6 - startOrder);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError(null);
    const supabase = createClient();
    let order = startOrder;
    for (const file of Array.from(files).slice(0, left)) {
      try {
        const blob = await compressImage(file, 1400, 0.8);
        const path = `${itemId}/${crypto.randomUUID()}.webp`;
        const up = await supabase.storage.from("market-photos").upload(path, blob, { contentType: "image/webp" });
        if (up.error) throw up.error;
        const row = await supabase.from("market_photos").insert({ item_id: itemId, storage_path: path, sort_order: order++ });
        if (row.error) throw row.error;
      } catch {
        setError(`Could not upload ${file.name}.`);
      }
    }
    setBusy(false);
    router.refresh();
  }

  if (!left) return <p className="text-sm text-muted">You&apos;ve added 6 photos, the most allowed.</p>;
  return (
    <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-[#9fb5a8] bg-sand p-5 text-center">
      <span className="font-bold">{busy ? "Uploading…" : startOrder ? "Add more photos" : "Add up to 6 photos"}</span>
      <span className="text-sm text-muted">Clear photos in daylight sell faster.</span>
      <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => onFiles(e.target.files)} />
      {error && <span role="alert" className="text-sm text-[#a1281a]">{error}</span>}
    </label>
  );
}
