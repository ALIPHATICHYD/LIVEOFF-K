/** Decorative background for the welcome screen: Gwagwalada skyline, route to the UniAbuja gate, floating icons. */

const HOUSES = [
  { x: 60, w: 56, h: 38 }, { x: 150, w: 46, h: 30 }, { x: 250, w: 64, h: 44 }, { x: 340, w: 46, h: 38 },
  { x: 430, w: 56, h: 30 }, { x: 520, w: 64, h: 44 }, { x: 610, w: 46, h: 38 }, { x: 700, w: 56, h: 44 },
  { x: 790, w: 46, h: 30 }, { x: 880, w: 64, h: 38 }, { x: 960, w: 46, h: 44 }, { x: 1250, w: 56, h: 38 },
  { x: 1340, w: 64, h: 30 },
];
const BASE = 162;

export function Skyline() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice">
      <path d="M0 118 Q130 58 250 98 T500 86 Q620 34 740 92 T990 78 Q1120 24 1230 88 T1440 80 V200 H0Z" fill="#0E6A44" />
      <path d="M330 150 Q360 70 420 74 Q470 78 492 150Z M1010 150 Q1030 96 1080 92 Q1130 96 1146 150Z" fill="#0D6440" />
      {HOUSES.map((h, i) => {
        const y = BASE - h.h;
        return (
          <g key={h.x}>
            <rect x={h.x} y={y} width={h.w} height={h.h} fill="#0A5236" />
            <path d={`M${h.x - 6} ${y} L${h.x + h.w / 2} ${y - 18} L${h.x + h.w + 6} ${y} Z`} fill="#094A31" />
            {Array.from({ length: h.w > 50 ? 2 : 1 }, (_, j) => (
              <rect key={j} className="lk-tw" x={h.x + 10 + j * 24} y={y + 10} width={10} height={10} rx={1} fill="#F2A900"
                style={{ animationDelay: `${((i * 7 + j * 3) % 9) * 0.45}s`, animationDuration: `${2.5 + ((i + j) % 5) * 0.5}s` }} />
            ))}
          </g>
        );
      })}
      <g fill="#CFE3D7" opacity="0.55">
        <rect x="1080" y="96" width="14" height="66" />
        <rect x="1196" y="96" width="14" height="66" />
        <path d="M1072 98 Q1145 50 1218 98 L1218 108 Q1145 64 1072 108Z" />
      </g>
      <text x="1145" y="90" textAnchor="middle" fontFamily="var(--font-display-face), sans-serif" fontWeight="700" fontSize="13" fill="#CFE3D7" opacity="0.8">UNIABUJA</text>
      <path className="lk-route" d="M290 140 C420 118 620 150 800 132 S1040 120 1145 150" fill="none" stroke="#F2A900" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 12" />
      <circle cx="1145" cy="150" r="6" fill="#F2A900" />
      <circle cx="1145" cy="150" r="6" fill="none" stroke="#F2A900" strokeWidth="2" className="lk-ping" />
      <rect x="0" y="162" width="1440" height="38" fill="#08442B" />
      <line x1="0" y1="181" x2="1440" y2="181" stroke="#CFE3D7" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="18 14" />
    </svg>
  );
}

export function Scenery() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1.4px)] bg-[length:14px_14px]" />
      <div className="lk-sun absolute -right-16 -top-16 size-72 rounded-full bg-[radial-gradient(circle,rgba(242,169,0,0.45)_0%,rgba(242,169,0,0.12)_45%,rgba(242,169,0,0)_70%)]" />
      <svg width="520" height="520" viewBox="0 0 64 64" className="absolute -right-48 top-32 opacity-[0.06]"><path d="M32 6 L58 28 L52 28 L52 56 L12 56 L12 28 L6 28 Z" fill="#FFFFFF" /></svg>
      <span className="lk-float absolute left-[6%] top-[18%] hidden opacity-50 lg:block">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#F2A900" strokeWidth="2"><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M15 8l2 2" /></svg>
      </span>
      <span className="lk-float absolute left-[44%] top-[10%] opacity-35 [animation-delay:1.2s]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CFE3D7" strokeWidth="2"><path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" /></svg>
      </span>
      <span className="lk-float absolute right-[8%] top-[48%] flex size-9 items-center justify-center rounded-full border-2 border-amber font-display text-base font-bold text-amber opacity-45 [animation-delay:2.1s]">₦</span>
      <div className="absolute inset-x-0 bottom-0 h-[120px] lg:h-[210px]"><Skyline /></div>
    </div>
  );
}
