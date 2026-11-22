"use client";

import Link from "next/link";
import { Skyline } from "@/components/welcome/Scenery";
import { useMemo, useState } from "react";
import { savePrefs } from "../../actions";

type AreaPoint = { slug: string; name: string; minutes: number | null; x: number; y: number };
type Budget = { id: string; label: string; min?: number; max?: number };

export function AreaPicker({ uni, uniName, areas, rents, budgets, initial }: {
  uni: string; uniName: string; areas: AreaPoint[];
  rents: { area: string; rent: number }[]; budgets: Budget[];
  initial: { areas: string[]; budget: string };
}) {
  const [picked, setPicked] = useState<string[]>(initial.areas.length ? initial.areas : areas.slice(0, 2).map((a) => a.slug));
  const [budget, setBudget] = useState(initial.budget || "any");
  const count = useMemo(() => {
    const b = budgets.find((x) => x.id === budget);
    return rents.filter((r) => picked.includes(r.area) && (b?.min === undefined || r.rent >= b.min) && (b?.max === undefined || r.rent < b.max)).length;
  }, [picked, budget, rents, budgets]);
  const toggle = (slug: string) => setPicked((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : [...p, slug]));

  return (
    <form action={savePrefs} className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-5 py-6">
      <input type="hidden" name="uni" value={uni} />
      {picked.map((a) => <input key={a} type="hidden" name="area" value={a} />)}
      <input type="hidden" name="budget" value={budget} />
      <Link href="/" className="self-start text-sm font-semibold text-brand">← {uniName}</Link>
      <div>
        <p className="text-sm text-muted">Step 2 of 2</p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight lg:text-4xl">Pick the areas you&apos;d live in</h1>
      </div>

      <div className="relative mx-auto aspect-[35/27] w-full max-w-[560px] overflow-hidden rounded-[22px] border border-[#d3ded6] bg-[#e3ede6]">
        <svg viewBox="0 0 350 270" className="absolute inset-0 size-full" aria-hidden="true">
          <path d="M-10 200 C 80 170, 140 150, 175 135 S 300 60, 360 40" stroke="#fff" strokeWidth="10" fill="none" />
          <path d="M175 135 L 120 280" stroke="#fff" strokeWidth="7" fill="none" />
          <path d="M175 135 L 330 230" stroke="#fff" strokeWidth="6" fill="none" />
        </svg>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
          {areas.filter((a) => picked.includes(a.slug)).map((a) => (
            <line key={a.slug} x1={a.x + 6} y1={a.y + 5} x2={50} y2={50} stroke="#F2A900" strokeWidth="3" strokeLinecap="round"
              strokeDasharray="1 7" vectorEffect="non-scaling-stroke" className="lk-route" />
          ))}
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-14 opacity-30"><Skyline /></div>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
          <span className="lk-pulse flex size-11 items-center justify-center rounded-full bg-amber text-ink">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M3 9l9-5 9 5-9 5z" /><path d="M7 11v5c3 2 7 2 10 0v-5" /></svg>
          </span>
          <span className="rounded-md bg-ink px-2 py-0.5 text-[11px] font-bold text-white">{uniName}</span>
        </div>
        {areas.map((a) => {
          const on = picked.includes(a.slug);
          return (
            <button key={a.slug} type="button" onClick={() => toggle(a.slug)} aria-pressed={on}
              style={{ left: `${a.x}%`, top: `${a.y}%` }}
              className={`absolute rounded-full border-2 px-3 py-1.5 text-[13px] font-bold shadow-[0_4px_12px_rgba(15,31,23,0.12)] transition-all ${on ? "border-brand bg-brand text-white" : "border-white bg-white text-ink hover:border-brand"}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true" className="-mt-0.5 mr-1 inline"><path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" /></svg>
              {a.name}{a.minutes != null && <span className="ml-1 font-medium opacity-80">{a.minutes} min</span>}
            </button>
          );
        })}
      </div>
      <p className="-mt-2 text-center text-xs text-muted">Tap areas to add or remove them. Times are rough travel times to campus.</p>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">Budget per year</legend>
        <div className="flex flex-wrap gap-2">
          {budgets.map((b) => (
            <button key={b.id} type="button" onClick={() => setBudget(b.id)} aria-pressed={budget === b.id}
              className={`rounded-full border px-3.5 py-2.5 text-sm font-semibold ${budget === b.id ? "border-ink bg-ink text-white" : "border-field bg-white text-ink"}`}>
              {b.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button disabled={!picked.length} className="btn-primary mt-auto h-14 rounded-[14px] text-base disabled:opacity-50">
        {!picked.length ? "Pick at least one area" : count ? `Show ${count} verified room${count === 1 ? "" : "s"}` : "Show rooms in these areas"}
      </button>
    </form>
  );
}
