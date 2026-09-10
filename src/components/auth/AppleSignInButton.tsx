"use client";

import Link from "next/link";

interface Props {
  mode: "login" | "register";
  redirect?: string;
}

export function AppleSignInButton({ mode, redirect }: Props) {
  const href = redirect
    ? `/api/auth/apple?redirect=${encodeURIComponent(redirect)}`
    : "/api/auth/apple";
  const label = mode === "login" ? "Continuer avec Apple" : "S’inscrire avec Apple";

  return (
    <Link
      href={href}
      className="btn-ghost inline-flex w-full items-center justify-center gap-3 border border-line bg-black text-white hover:bg-neutral-800"
    >
      <AppleIcon />
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 170 170" aria-hidden>
      <path
        fill="currentColor"
        d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.22-9.28 6.37-14.42 6.45-3.69.08-8.14-1.05-13.32-3.4-5.13-2.34-9.88-3.5-14.22-3.5-4.58 0-9.42 1.16-14.54 3.5-5.13 2.35-9.28 3.56-12.47 3.63-4.82.15-9.63-1.9-14.42-6.14-3.1-2.7-7.05-7.41-11.85-14.14-5.28-7.36-9.62-15.9-12.99-25.63-3.55-10.17-5.33-20.02-5.33-29.55 0-10.91 2.35-20.34 7.05-28.28 3.7-6.37 8.66-11.41 14.86-15.12 6.2-3.71 12.93-5.61 20.18-5.69 3.88 0 8.97 1.2 15.3 3.59 6.33 2.39 10.39 3.59 12.18 3.59 1.33 0 5.92-1.43 13.74-4.28 7.36-2.62 13.59-3.7 18.68-3.23 13.82 1.12 24.19 6.57 31.1 16.39-12.37 7.5-18.52 17.96-18.45 31.44.07 10.48 3.91 19.2 11.52 26.16 3.43 3.25 7.27 5.74 11.54 7.5-1.47 4.26-3.02 8.34-4.67 12.24zM119.11 7.24c0 8.22-3 15.92-8.97 23.11-7.2 8.58-15.92 12.87-26.15 12.87-.15-9.97 3.66-19.11 11.43-27.41 3.88-4.04 8.81-7.26 14.78-9.67 5.97-2.34 11.53-3.55 16.68-3.63.07 1.5.15 2.99.23 4.48-.07 0-.07 0 0 0z"
      />
    </svg>
  );
}
