"use client";

import { useActionState, useState } from "react";
import { createItem, type FormState } from "@/app/(app)/market/actions";
import { Icon } from "@/components/Icons";
import { MARKET_CATEGORIES, MARKET_CONDITIONS, marketFeeKobo } from "@/lib/market";

function Chips<T extends string>({ name, options, value, onChange }: { name: string; options: Record<T, string>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name={name} value={value} />
      {(Object.keys(options) as T[]).map((k) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}
          className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${value === k ? "border-brand bg-brand text-white" : "border-field bg-white text-ink"}`}>
          {options[k]}
        </button>
      ))}
    </div>
  );
}

export function SellForm({ areas }: { areas: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createItem, {});
  const [cat, setCat] = useState<keyof typeof MARKET_CATEGORIES>("room");
  const [cond, setCond] = useState<keyof typeof MARKET_CONDITIONS>("good");
  const [bundle, setBundle] = useState(false);
  const [price, setPrice] = useState("");
  const kobo = Number(price.replace(/\D/g, "")) * 100;
  const catLabels = Object.fromEntries(Object.entries(MARKET_CATEGORIES).map(([k, v]) => [k, v.label])) as Record<keyof typeof MARKET_CATEGORIES, string>;

  return (
    <form action={action} className="flex flex-col gap-5">
      <button type="button" aria-pressed={bundle} onClick={() => setBundle(!bundle)}
        className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${bundle ? "border-brand bg-mint" : "border-line bg-white"}`}>
        <Icon name="bag" size={28} className="flex-none text-brand" />
        <span className="flex-1"><span className="block font-bold">Moving out? Sell it all as one bundle</span>
          <span className="text-[13px] text-muted">Mattress, gas, fan and table for one price. Bundles sell faster.</span></span>
        <span className={`flex size-6 flex-none items-center justify-center rounded-md border-2 ${bundle ? "border-brand bg-brand text-white" : "border-field"}`}>{bundle && <Icon name="check" size={14} strokeWidth={3} />}</span>
      </button>
      <input type="hidden" name="bundle" value={bundle ? "1" : "0"} />

      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">{bundle ? "Name your bundle" : "What are you selling?"}
        <input name="title" required minLength={3} maxLength={100} className="field" placeholder={bundle ? "Full self-contain setup, Giri" : "6-inch foam mattress"} />
      </label>

      {bundle && (
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">What&apos;s in it? (one per line or comma separated)
          <textarea name="contents" rows={3} className="rounded-[10px] border border-field p-3 font-medium" placeholder={"Mattress, reading table, gas cylinder, standing fan"} />
        </label>
      )}

      <div className="flex flex-col gap-2"><span className="text-[13px] font-semibold">Category</span>
        <Chips name="category" options={catLabels} value={cat} onChange={setCat} /></div>
      <div className="flex flex-col gap-2"><span className="text-[13px] font-semibold">Condition</span>
        <Chips name="condition" options={MARKET_CONDITIONS} value={cond} onChange={setCond} /></div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Price (₦)
          <input name="price" required inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className="field" placeholder="35000" />
        </label>
        {bundle ? (
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Worth if bought separately (₦, optional)
            <input name="was" inputMode="numeric" className="field" placeholder="112000" />
          </label>
        ) : <span className="hidden sm:block" />}
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Pickup area
          <select name="area" required defaultValue="" className="field">
            <option value="" disabled>Choose an area</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Description
        <textarea name="description" rows={4} maxLength={1500} className="rounded-[10px] border border-field p-3 font-medium" placeholder="Age, any faults, what's included, when you can hand it over." />
      </label>

      <p className="flex gap-2.5 rounded-xl bg-[#fff3d1] p-3 text-[13px] text-[#6b4a00]">
        <Icon name="shield" className="flex-none" />
        <span>If the buyer pays through escrow, you get the money as soon as they confirm they have the item.
          {kobo >= 10000 && ` The buyer pays a ₦${(marketFeeKobo(kobo) / 100).toLocaleString("en-NG")} protection fee on top; you get the full price.`}</span>
      </p>
      {state.error && <p role="alert" className="text-sm text-[#a1281a]">{state.error}</p>}
      <button disabled={pending} className="btn-primary h-13 rounded-[14px] text-base disabled:opacity-60">{pending ? "Posting…" : "Post and add photos"}</button>
    </form>
  );
}
