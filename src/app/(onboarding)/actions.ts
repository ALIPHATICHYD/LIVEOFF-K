"use server";

import { redirect } from "next/navigation";
import { BUDGETS, setPrefs, type BudgetId } from "@/lib/prefs";

export async function savePrefs(form: FormData) {
  const uni = String(form.get("uni") ?? "").slice(0, 40);
  const areas = form.getAll("area").map(String).filter((a) => /^[a-z0-9-]{1,40}$/.test(a)).slice(0, 20);
  const raw = String(form.get("budget") ?? "any");
  const budget = (BUDGETS.some((b) => b.id === raw) ? raw : "any") as BudgetId;
  await setPrefs({ uni, areas, budget });
  redirect("/listings");
}
