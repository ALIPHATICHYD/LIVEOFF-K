"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-3 px-5 py-16">
      <h1 className="font-display text-2xl font-bold">Something went wrong on our side</h1>
      <p className="text-muted">Your money and bookings are safe. Try again, or message support if it keeps happening.</p>
      {digest && <p className="text-xs text-faint">Error code {digest}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => retry()} className="btn-primary">Try again</button>
        <Link href="/support" className="btn-ghost">Message support</Link>
      </div>
    </div>
  );
}
