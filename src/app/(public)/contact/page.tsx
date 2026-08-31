import type { Metadata } from "next";
import { PublicContactForm } from "@/components/PublicContactForm";

export const metadata: Metadata = {
  title: "Contact — Matchs Amicaux",
  description:
    "Contactez l'équipe de Matchs Amicaux pour toute question, suggestion ou demande concernant la plateforme de matchs amicaux pour clubs amateurs.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <p className="eyebrow text-accent">Contact</p>
      <h1 className="headline mt-2 text-4xl text-paper sm:text-5xl">
        Parlons foot
      </h1>
      <p className="mt-4 text-lg text-muted">
        Nous sommes à votre écoute pour améliorer Matchs Amicaux et répondre à
        vos questions.
      </p>

      <div className="mt-8">
        <PublicContactForm />
      </div>

      <div className="mt-8 text-center text-sm text-muted">
        <p>
          Vous préférez écrire directement ?{" "}
          <a
            href="mailto:matchamicalamateur@gmail.com"
            className="text-accent hover:underline"
          >
            matchamicalamateur@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
