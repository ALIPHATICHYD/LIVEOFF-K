"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icons";

export type NavItem = { href: string; label: string; icon: IconName; badge?: number };

function isActive(path: string, href: string) {
  return href === "/listings" ? path === "/listings" || path.startsWith("/listings/") : path === href || path.startsWith(`${href}/`);
}

export function SideNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {items.map((i) => {
        const on = isActive(path, i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
            className={`flex h-12 items-center gap-3 rounded-xl px-3.5 text-[15px] font-semibold transition-colors ${on ? "bg-white/10 text-amber" : "text-[#cfe3d7] hover:bg-white/5 hover:text-white"}`}>
            <Icon name={i.icon} />
            <span className="flex-1">{i.label}</span>
            {!!i.badge && <span className="rounded-full bg-amber px-2 text-xs font-bold text-ink">{i.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function TabBar({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-3 bottom-3 z-40 grid h-16 grid-cols-5 rounded-[20px] bg-ink shadow-[0_10px_30px_rgba(15,31,23,0.25)] lg:hidden">
      {items.slice(0, 5).map((i) => {
        const on = isActive(path, i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold ${on ? "text-amber" : "text-[#cfe3d7]"}`}>
            <Icon name={i.icon} />
            {i.label}
            {!!i.badge && <span className="absolute right-[18%] top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[10px] font-bold text-ink">{i.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
