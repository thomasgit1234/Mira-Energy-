import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Mira Énergie", description: "Aide à la conformité au décret tertiaire" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
