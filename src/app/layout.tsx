import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: "LiveOff-K: verified student rooms near University of Abuja", template: "%s · LiveOff-K" },
  description: "Find. Rent. Live. Better. Verified rooms near campus, every fee upfront, and your rent held in escrow until you move in.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
