const paths = {
  home: "M3 11l9-7 9 7v9h-6v-6H9v6H3z",
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  shield: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z",
  chat: "M4 5h16v11H8l-4 4z",
  plus: "M12 5v14M5 12h14",
  admin: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  pin: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z",
  back: "M15 5l-7 7 7 7",
  next: "M9 5l7 7-7 7",
  user: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4 4-6 8-6s8 2 8 6",
  send: "M4 12l16-8-6 16-2-6z",
  check: "M5 12l5 5L20 7",
  cap: "M3 9l9-5 9 5-9 5zM7 11v5c3 2 7 2 10 0v-5",
  bag: "M3 7h18l-2 13H5zM8 7a4 4 0 0 1 8 0",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  bed: "M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M3 18v2M21 18v2M6 10V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3",
  pot: "M8 3v4M12 3v4M16 3v4M5 9h14v3a7 7 0 0 1-14 0zM9 21h6",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7",
  laptop: "M4 5h16v10H4zM2 19h20M9 15v4M15 15v4",
  bike: "M6 18a3 3 0 1 0 0-.01M18 18a3 3 0 1 0 0-.01M6 18l4-8h5l3 8M10 10l-2-4H6",
} as const;
export type IconName = keyof typeof paths;

export function Icon({ name, size = 22, className, strokeWidth = 2 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={paths[name]} />
    </svg>
  );
}
