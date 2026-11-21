/** A line of short facts that rolls every few seconds. Pure CSS; the first line repeats so the loop is seamless. */
export function Ticker({ lines }: { lines: React.ReactNode[] }) {
  const rows = lines.slice(0, 3);
  if (rows.length < 3) return null;
  return (
    <div className="h-[22px] overflow-hidden text-[13px] text-[#cfe3d7]">
      <div className="lk-ticker flex flex-col">
        {[...rows, rows[0]].map((l, i) => (
          <span key={i} aria-hidden={i === 3 || undefined} className="h-[22px] leading-[22px] [&_b]:text-amber">{l}</span>
        ))}
      </div>
    </div>
  );
}
