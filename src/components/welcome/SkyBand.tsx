import { Skyline } from "./Scenery";

/** Dotted texture plus a faint Gwagwalada skyline, for the bottom edge of green panels. Parent must be `relative overflow-hidden`. */
export function SkyBand({ className = "h-16 lg:h-24", opacity = "opacity-60" }: { className?: string; opacity?: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1.4px)] bg-[length:14px_14px]" />
      <div className={`absolute inset-x-0 bottom-0 ${className} ${opacity}`}><Skyline /></div>
    </div>
  );
}
