"use client";

// Fond décoratif statique (pas de vidéo) pour garantir une expérience fluide
// sur tous les appareils et connexions.

export function BackgroundVideo() {
  return (
    <div
      className="fixed inset-0 z-0"
      aria-hidden
      style={{
        background:
          "radial-gradient(1200px 600px at 80% -10%, rgba(46, 224, 106, 0.06), transparent 60%), " +
          "radial-gradient(1000px 500px at 0% 0%, rgba(45, 125, 246, 0.07), transparent 55%), " +
          "linear-gradient(180deg, #0a0f0c 0%, #0d1210 100%)",
      }}
    />
  );
}
