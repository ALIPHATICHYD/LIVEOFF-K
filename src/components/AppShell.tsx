import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { LogoMark, Wordmark } from "./Logo";
import { SideNav, TabBar, type NavItem } from "./NavLinks";

/** Responsive frame: left menu on desktop, floating tab bar on phones. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  let savedCount = 0;
  if (profile && isSupabaseConfigured) {
    const supabase = await createClient();
    const { count } = await supabase.from("saved_listings").select("listing_id", { count: "exact", head: true }).eq("user_id", profile.id);
    savedCount = count ?? 0;
  }
  const items: NavItem[] = [
    { href: "/listings", label: "Rooms", icon: "home" },
    { href: "/market", label: "Market", icon: "bag" },
    { href: "/saved", label: "Saved", icon: "heart", badge: savedCount },
    { href: "/payments", label: "Payments", icon: "shield" },
    { href: "/support", label: "Support", icon: "chat" },
  ];
  const extra: NavItem[] = [];
  if (profile && ["landlord", "agent", "admin"].includes(profile.role)) extra.push({ href: "/upload", label: "List a property", icon: "plus" });
  if (profile?.role === "admin") extra.push({ href: "/admin", label: "Admin", icon: "admin" });

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col gap-6 bg-ink px-3.5 py-6 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2 px-2"><LogoMark size={30} inverse /><Wordmark inverse /></Link>
        <SideNav items={[...items, ...extra]} />
        <div className="mt-auto flex flex-col gap-3 px-2 text-sm text-[#9fc4b0]">
          {profile ? (
            <form action="/auth/signout" method="post"><button className="font-semibold text-white">Log out</button></form>
          ) : (
            <Link href="/login" className="btn bg-amber text-ink">Log in or sign up</Link>
          )}
          <div className="flex gap-3">
            {/* TODO: real handles once the founder confirms them */}
            <a href="https://x.com/" aria-label="LiveOff-K on X">X</a>
            <a href="https://instagram.com/" aria-label="LiveOff-K on Instagram">Instagram</a>
          </div>
          <span>Find. Rent. Live. Better.</span>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2"><LogoMark size={28} /><Wordmark /></Link>
        {profile ? (
          extra.length ? <Link href={extra[extra.length - 1].href} className="btn-ghost h-10 text-sm">{extra[extra.length - 1].label}</Link>
            : <form action="/auth/signout" method="post"><button className="btn-ghost h-10 text-sm">Log out</button></form>
        ) : (
          <Link href="/login" className="btn-primary h-10 text-sm">Log in</Link>
        )}
      </header>

      <main className="pb-28 lg:pb-0 lg:pl-[232px]">{children}</main>
      <TabBar items={items} />
    </div>
  );
}
