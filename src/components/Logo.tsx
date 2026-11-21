/** Logo option A (house with keyhole). Pass `inverse` on green backgrounds. */
export function LogoMark({ size = 36, inverse = false }: { size?: number; inverse?: boolean }) {
  const body = inverse ? "#FFFFFF" : "#0B5D3B";
  const hole = inverse ? "#0B5D3B" : "#F6F5EF";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="40" y="10" width="7" height="14" fill="#F2A900" />
      <path d="M32 6 L58 28 L52 28 L52 56 L12 56 L12 28 L6 28 Z" fill={body} />
      <circle cx="32" cy="35" r="6" fill={hole} />
      <path d="M29 39 L35 39 L37 50 L27 50 Z" fill={hole} />
    </svg>
  );
}

export function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="font-display text-[22px] font-bold">
      LiveOff<span className={inverse ? "text-amber" : "text-brand"}>-K</span>
    </span>
  );
}
