import "./globals.css";
import type { Metadata } from "next";
import { Manrope, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

// Self-hosted via next/font (no external Google Fonts request, no CLS) —
// same three families as the design spec (§3.2), served through Next's
// build-time font optimization instead of the spec mockup's <link> tag.
const manrope = Manrope({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-manrope" });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Covoit TN",
  description: "Tunisian carpooling — travel together.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${manrope.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body className="bg-background font-body text-ink antialiased">{children}</body>
    </html>
  );
}
