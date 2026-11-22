import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";

const body = DM_Sans({ variable: "--font-body", subsets: ["latin"], axes: ["opsz"] });
const display = Bricolage_Grotesque({ variable: "--font-display-face", subsets: ["latin"], axes: ["opsz", "wdth"] });

export const metadata: Metadata = {
  title: { default: "LiveOff-K: verified student rooms near University of Abuja", template: "%s · LiveOff-K" },
  description: "Find. Rent. Live. Better. Verified rooms near campus, every fee upfront, and your rent held in escrow until you move in.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
