import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { LogoMark, Wordmark } from "./Logo";

export async function Header() {
  const profile = await getProfile();
  const canList = profile && ["landlord", "agent", "admin"].includes(profile.role);
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 text-ink">
          <LogoMark />
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex flex-wrap gap-7 text-[15px] font-medium">
          <Link href="/">Home</Link>
          <Link href="/listings">Listings</Link>
          <Link href="/upload">Upload Listing</Link>
          <Link href="/#help">Help</Link>
          {profile?.role === "admin" && <Link href="/admin">Admin</Link>}
        </nav>
        {profile ? (
          <form action="/auth/signout" method="post" className="flex items-center gap-3">
            <span className="text-sm text-muted">{canList ? "Landlord/agent" : "Student"} account</span>
            <button className="btn-ghost">Log out</button>
          </form>
        ) : (
          <Link href="/login" className="btn-primary">Log in or sign up</Link>
        )}
      </div>
    </header>
  );
}
