import "server-only";
import { cookies } from "next/headers";

/** What the student picked during onboarding. Stored in a cookie so it works before login. */
export type Prefs = { uni: string; areas: string[]; budget: BudgetId };
export type BudgetId = "low" | "mid" | "high" | "any";

export const BUDGETS: { id: BudgetId; label: string; min?: number; max?: number }[] = [
  { id: "low", label: "Under ₦300k", max: 300_000 },
  { id: "mid", label: "₦300k to ₦600k", min: 300_000, max: 600_000 },
  { id: "high", label: "₦600k+", min: 600_000 },
  { id: "any", label: "Any budget" },
];

const COOKIE = "lk_prefs";

export async function getPrefs(): Promise<Prefs | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Prefs;
    if (typeof p.uni !== "string" || !Array.isArray(p.areas)) return null;
    return { uni: p.uni, areas: p.areas.filter((a) => typeof a === "string").slice(0, 20), budget: BUDGETS.some((b) => b.id === p.budget) ? p.budget : "any" };
  } catch {
    return null;
  }
}

export async function setPrefs(p: Prefs) {
  (await cookies()).set(COOKIE, JSON.stringify(p), { path: "/", maxAge: 60 * 60 * 24 * 180, sameSite: "lax", httpOnly: true });
}
