"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useScroll, useMotionValueEvent, useReducedMotion } from "framer-motion";

// Vidéo de fond fixe, dont la tête de lecture est liée au scroll
// (scroll-scrubbing cinématique). Limitée aux pages vitrines (accueil et
// « comment ça marche ») — pas sur les formulaires, dashboard, admin ni les
// fiches, pour garder ces pages sobres et lisibles. Fallbacks :
//  - autre route               -> vidéo non rendue (fond gradient du body)
//  - pas de fichier / erreur   -> vidéo masquée, fond gradient du body inchangé
//  - prefers-reduced-motion    -> vidéo non rendue
//  - mobile (<=768px)          -> vidéo non rendue (perf / data)
// L'overlay (scrim + gradients) n'est rendu qu'avec la vidéo, pour préserver
// le rendu actuel quand elle est absente.

const SHOWCASE_ROUTES = ["/", "/comment-ca-marche"];

const GRADIENTS =
  "radial-gradient(1200px 600px at 80% -10%, rgba(46, 224, 106, 0.06), transparent 60%)," +
  "radial-gradient(1000px 500px at 0% 0%, rgba(45, 125, 246, 0.07), transparent 55%)";

const MOBILE_MQ = "(max-width: 768px)";

function subscribeIsDesktop(callback: () => void) {
  const mq = window.matchMedia(MOBILE_MQ);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function getIsDesktopSnapshot() {
  return !window.matchMedia(MOBILE_MQ).matches;
}
function getServerSnapshot() {
  return false; // SSR : pas de vidéo (rendue côté client après hydratation)
}

export function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();
  const isDesktop = useSyncExternalStore(subscribeIsDesktop, getIsDesktopSnapshot, getServerSnapshot);
  const pathname = usePathname();
  const onShowcase = SHOWCASE_ROUTES.includes(pathname);
  const enabled = !reduceMotion && isDesktop && onShowcase;

  const [broken, setBroken] = useState(false); // fichier absent / erreur
  const [ready, setReady] = useState(false); // fade-in doux à la première lecture possible

  const { scrollYProgress } = useScroll();

  // Scrubbing : la tête de lecture suit la progression du scroll (0 -> duration).
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const video = videoRef.current;
    if (!video || !enabled) return;
    if (video.readyState < 2 || !Number.isFinite(video.duration) || video.duration === 0) return;
    video.currentTime = Math.min(v, 1) * video.duration;
  });

  // Hors pages vitrines : on ne rend rien (fond gradient du body en fallback).
  // Placé après tous les hooks pour respecter les rules of hooks.
  if (!onShowcase) return null;

  const showVideo = enabled && !broken;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {showVideo && (
        <>
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            onCanPlay={() => setReady(true)}
            onLoadedMetadata={(e) => {
              // aligne la première frame sur la position de scroll courante
              const video = e.currentTarget;
              const v = scrollYProgress.get();
              if (Number.isFinite(video.duration) && video.duration > 0) {
                video.currentTime = Math.min(v, 1) * video.duration;
              }
            }}
            onError={() => setBroken(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              ready ? "opacity-100" : "opacity-0"
            }`}
          >
            <source src="/videos/bg.mp4" type="video/mp4" />
            <source src="/videos/bg.webm" type="video/webm" />
          </video>

          {/* Scrim + gradients par-dessus la vidéo pour la lisibilité et l'identité visuelle */}
          <div className="absolute inset-0 bg-ink/70" />
          <div className="absolute inset-0" style={{ background: GRADIENTS }} />
        </>
      )}
    </div>
  );
}