import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Covoit TN",
  description: "Tunisian carpooling — travel together.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
