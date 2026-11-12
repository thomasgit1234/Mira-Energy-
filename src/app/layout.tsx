import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

export const metadata: Metadata = { title: "Mira Énergie", description: "Aide à la conformité au décret tertiaire" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AppHeader />
        <div id="contenu">{children}</div>
      </body>
    </html>
  );
}
