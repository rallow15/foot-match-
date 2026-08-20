import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ajouter Matchs Amicaux à votre écran d’accueil",
  description:
    "Retrouvez Matchs Amicaux en un geste sur votre smartphone. Suivez les instructions pour l’ajouter à l’écran d’accueil sous iOS (Safari) ou Android (Chrome).",
};

const iosSteps = [
  {
    n: "1",
    text: "Ouvrez le site **matchs-amicaux.fr** dans l’app **Safari**.",
  },
  {
    n: "2",
    text: "Appuyez sur l’icône **Partager** en bas ou en haut de l’écran (le carré avec une flèche).",
  },
  {
    n: "3",
    text: "Faites défiler la ligne d’actions grise, puis appuyez sur **« Ajouter à l’écran d’accueil »**.",
  },
  {
    n: "4",
    text: "Validez en haut à droite. L’icône apparaît sur votre home screen comme une application.",
  },
];

const androidSteps = [
  {
    n: "1",
    text: "Ouvrez le site **matchs-amicaux.fr** dans l’app **Chrome**.",
  },
  {
    n: "2",
    text: "Appuyez sur le **menu ⋮** en haut à droite du navigateur.",
  },
  {
    n: "3",
    text: "Sélectionnez **« Ajouter à l’écran d’accueil »** (parfois « Installer l’application »).",
  },
  {
    n: "4",
    text: "Confirmez. Le raccourci s’ajoute à votre écran d’accueil et se lance en plein écran.",
  },
];

function StepList({ steps }: { steps: { n: string; text: string }[] }) {
  return (
    <ol className="mt-6 space-y-4">
      {steps.map((s) => (
        <li key={s.n} className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-[#04210f]">
            {s.n}
          </span>
          <p
            className="text-sm leading-relaxed text-muted"
            dangerouslySetInnerHTML={{ __html: s.text }}
          />
        </li>
      ))}
    </ol>
  );
}

export default function AjouterEcranAccueilPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <p className="eyebrow text-accent">Raccourci mobile</p>
      <h1 className="headline mt-2 text-4xl text-paper sm:text-5xl">
        Ajouter à l’écran d’accueil
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Retrouvez Matchs Amicaux en un clin d’œil, comme une vraie application.
        Choisissez votre système ci-dessous.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍎</span>
            <h2 className="headline text-2xl text-paper">iPhone & iPad</h2>
          </div>
          <p className="mt-1 text-xs text-muted">Safari · iOS 13+</p>
          <StepList steps={iosSteps} />
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <h2 className="headline text-2xl text-paper">Android</h2>
          </div>
          <p className="mt-1 text-xs text-muted">Chrome · Android 5+</p>
          <StepList steps={androidSteps} />
        </div>
      </div>

      <div className="card mt-10 p-6 text-center">
        <p className="headline text-xl text-paper">Une fois ajouté</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          L’icône verte du ballon s’affiche sur votre écran d’accueil. En
          l’ouvrant, le site se lance en plein écran, sans la barre d’adresse de
          Safari ou Chrome.
        </p>
      </div>
    </div>
  );
}
