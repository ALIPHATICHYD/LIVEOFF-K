"use client";

import { useActionState } from "react";
import { FACILITIES, PROPERTY_TYPES } from "@/lib/format";
import type { Area } from "@/lib/types";
import { createListing, type FormState } from "./actions";

const label = "flex min-w-0 flex-col gap-1.5 text-sm font-semibold";

export function NewListingForm({ areas }: { areas: Area[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createListing, {});
  return (
    <form action={action} className="card flex flex-col gap-6 p-7">
      <h2 className="text-xl font-bold">Step 1: Property details</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Listing title<input name="title" required placeholder="Self-contain in Dagiri" className="field" /></label>
        <label className={label}>Property type
          <select name="propertyType" className="field">{Object.entries(PROPERTY_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label className={label}>Area near University of Abuja
          <select name="areaId" required className="field">{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        </label>
        <label className={label}>Minutes to the main gate<input name="minutesToGate" inputMode="numeric" placeholder="e.g. 10" className="field" /></label>
        <label className={`${label} sm:col-span-2`}>Full address
          <input name="address" required placeholder="House number, street, landmark" className="field" />
          <span className="text-xs font-normal text-muted">Only shared with students after they book an inspection.</span>
        </label>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-bold">Rent and every fee (₦)</legend>
        <div className="grid gap-3.5 sm:grid-cols-4">
          <label className={label}>Rent per year<input name="rent" inputMode="numeric" required className="field" /></label>
          <label className={label}>Agent fee<input name="agentFee" inputMode="numeric" defaultValue="0" className="field" /></label>
          <label className={label}>Caution fee<input name="cautionFee" inputMode="numeric" defaultValue="0" className="field" /></label>
          <label className={label}>Other fees<input name="otherFees" inputMode="numeric" defaultValue="0" className="field" /></label>
        </div>
        <label className={label}>What are the other fees for?<input name="otherFeesNote" placeholder="e.g. Legal fee" className="field" /></label>
        <p className="rounded-[10px] bg-amber-soft p-3 text-[13px] text-amber-ink">Students see the total first payment. Fees not listed here cannot be charged later.</p>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={label}>Bedrooms<select name="bedrooms" defaultValue="1" className="field"><option>0</option><option>1</option><option>2</option><option>3</option></select></label>
        <label className={label}>Minimum rental (months)<input name="minMonths" inputMode="numeric" defaultValue="12" className="field" /></label>
        <label className={label}>Available from<input type="date" name="availableFrom" className="field" /></label>
      </div>
      <fieldset>
        <legend className="mb-3 font-bold">Facilities</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2.5 text-[15px]"><input type="checkbox" name="furnished" className="size-5 accent-brand" />Furnished</label>
          {FACILITIES.filter((f) => f !== "Furnished").map((f) => (
            <label key={f} className="flex items-center gap-2.5 text-[15px]"><input type="checkbox" name="facilities" value={f} className="size-5 accent-brand" />{f}</label>
          ))}
        </div>
      </fieldset>
      <label className={label}>Description
        <textarea name="description" rows={4} placeholder="Room size, water, power, rules, neighbours" className="rounded-[10px] border border-field p-3 font-medium" />
      </label>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div className="flex justify-end">
        <button disabled={pending} className="btn-primary h-12 px-7 disabled:opacity-60">{pending ? "Saving…" : "Continue to photos"}</button>
      </div>
    </form>
  );
}
