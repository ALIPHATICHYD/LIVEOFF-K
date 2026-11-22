"use client";

/** Last-resort screen when the root layout itself fails. Uses inline styles: globals.css isn't loaded here. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "oklch(96.9% 0.008 99)", color: "oklch(22.2% 0.027 160)", fontFamily: "system-ui, sans-serif" }}>
        <title>Something went wrong · LiveOff-K</title>
        <main style={{ maxWidth: 380, padding: 24 }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>LiveOff-K hit a problem</h1>
          <p style={{ margin: "0 0 16px", color: "oklch(45% 0.024 160)" }}>Your money and bookings are safe. Please try again.</p>
          <button type="button" onClick={() => retry()} style={{ height: 44, padding: "0 16px", border: 0, borderRadius: 10, background: "oklch(42.4% 0.093 160)", color: "white", fontWeight: 600, fontSize: 15 }}>Try again</button>
        </main>
      </body>
    </html>
  );
}
