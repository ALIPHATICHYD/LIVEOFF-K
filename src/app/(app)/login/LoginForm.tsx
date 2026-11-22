"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Demo sign-in (Supabase anonymous auth) is on unless NEXT_PUBLIC_DEMO_LOGIN=off.
const DEMO = process.env.NEXT_PUBLIC_DEMO_LOGIN !== "off";

/** 0803 123 4567 or 803... or +234803... -> +2348031234567 */
function toE164(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  return `+234${digits}`;
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] = useState<"student" | "landlord" | "agent">("student");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      phone: toE164(phone),
      // account_type is only used the first time an account is created
      options: { data: { account_type: accountType } },
    });
    setBusy(false);
    if (error) setError("We couldn't send a code to that number. Check it and try again.");
    else setSent(true);
  }

  async function tryDemo() {
    setBusy(true); setError(null);
    const { error } = await createClient().auth.signInAnonymously({ options: { data: { account_type: accountType } } });
    setBusy(false);
    if (error) return setError("Demo sign-in is switched off. Turn on anonymous sign-ins in Supabase (see the README).");
    router.replace(next);
    router.refresh();
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await createClient().auth.verifyOtp({ phone: toE164(phone), token: code.trim(), type: "sms" });
    setBusy(false);
    if (error) return setError("That code didn't work. Check it or request a new one.");
    router.replace(next);
    router.refresh();
  }

  return sent ? (
    <form onSubmit={verify} className="flex flex-col gap-4">
      <p className="text-sm text-muted">We sent a 6-digit code to {toE164(phone)}.</p>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">Code
        <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" required className="field tracking-widest" />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button disabled={busy} className="btn-primary h-12 disabled:opacity-60">{busy ? "Checking…" : "Continue"}</button>
      <button type="button" onClick={() => setSent(false)} className="text-sm font-semibold text-brand">Use a different number</button>
    </form>
  ) : (
    <form onSubmit={sendCode} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">Phone number
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="0803 123 4567" required className="field" />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">New here? I am a</legend>
        {(["student", "landlord", "agent"] as const).map((t) => (
          <label key={t} className="flex items-center gap-2.5 text-[15px] capitalize">
            <input type="radio" name="type" checked={accountType === t} onChange={() => setAccountType(t)} className="size-5 accent-brand" />{t}
          </label>
        ))}
      </fieldset>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button disabled={busy} className="btn-primary h-12 disabled:opacity-60">{busy ? "Sending…" : "Send code"}</button>
      {DEMO && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <button type="button" disabled={busy} onClick={tryDemo} className="btn-ghost h-12 disabled:opacity-60">
            Try the demo as a {accountType}
          </button>
          <p className="text-xs text-muted">No phone needed. You get a temporary test account; nothing is charged.</p>
        </div>
      )}
    </form>
  );
}
