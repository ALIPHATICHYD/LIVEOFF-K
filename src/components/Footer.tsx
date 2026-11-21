import Link from "next/link";

export function Footer() {
  return (
    <footer id="help" className="mt-auto border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-6 px-6 py-10 text-sm text-muted">
        <div className="flex flex-col gap-1.5">
          <span className="font-display text-lg font-bold text-ink">LiveOff<span className="text-brand">-K</span></span>
          <span>Find. Rent. Live. Better.</span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-6">
          <Link href="/#help">Help centre</Link>
          <Link href="/listings">Report a listing</Link>
          <a href="#">Terms</a>
          <a href="#">Privacy policy</a>
        </nav>
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-ink">Follow us</span>
          <div className="flex gap-2.5">
            {/* TODO: real handles once the founder confirms them */}
            <a href="https://x.com/" aria-label="LiveOff-K on X" className="flex size-11 items-center justify-center rounded-[10px] border border-line text-ink">X</a>
            <a href="https://instagram.com/" aria-label="LiveOff-K on Instagram" className="flex size-11 items-center justify-center rounded-[10px] border border-line text-ink">IG</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
