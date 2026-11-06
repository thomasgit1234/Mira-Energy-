
import Link from "next/link";
import EmailRequestForm from "@/modules/collecte/EmailRequestForm";

export default function Page() {
  return (
    <main className="page">
      <Link href="/collecte" className="back">
        ← Retour à la collecte
      </Link>

      <p className="eyebrow">
        Phase 02 · Collecte des données
      </p>

      <h1>Demande d&apos;historique par e-mail (2.3)</h1>

      <p>
        Préparez une demande d&apos;historique de consommation
        énergétique à envoyer à votre fournisseur.
      </p>

      <EmailRequestForm />
    </main>
  );
}

