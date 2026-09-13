"use client";

import { useState } from "react";
import Link from "next/link";
import { getCategorie, STATUT_ANNONCE_LABEL } from "@/lib/referential";

interface AnnonceLite {
  id: string;
  date: string;
  heure: string;
  statut: string;
  equipe: { categorie: string; niveau: string | null };
}

interface Props {
  annonces: AnnonceLite[];
}

export function CalendarView({ annonces }: Props) {
  const [current, setCurrent] = useState(new Date());
  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Lundi = 0
  const daysInMonth = lastDay.getDate();

  const prev = () => setCurrent(new Date(year, month - 1, 1));
  const next = () => setCurrent(new Date(year, month + 1, 1));

  const monthLabel = current.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const weekdays = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

  const byDay = new Map<number, AnnonceLite[]>();
  for (const a of annonces) {
    const [y, m, d] = a.date.split("-").map(Number);
    if (y === year && m - 1 === month) {
      const list = byDay.get(d) ?? [];
      list.push(a);
      byDay.set(d, list);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={prev} className="btn-xs-ghost">← Préc.</button>
        <p className="headline text-lg text-paper capitalize">{monthLabel}</p>
        <button type="button" onClick={next} className="btn-xs-ghost">Suiv. →</button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {weekdays.map((w) => (
          <div key={w} className="text-xs font-display uppercase text-muted-2">{w}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[80px] rounded-sm bg-ink-2/50" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const items = byDay.get(day) ?? [];
          return (
            <div key={day} className="min-h-[80px] rounded-sm border border-line p-1">
              <span className="text-xs text-muted-2">{day}</span>
              <div className="mt-1 space-y-1">
                {items.map((a) => {
                  const cat = getCategorie(a.equipe.categorie);
                  return (
                    <Link
                      key={a.id}
                      href={`/dashboard/annonces/${a.id}/modifier`}
                      className={`block truncate rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${
                        a.statut === "ouvert"
                          ? "bg-accent/20 text-[#04210f]"
                          : a.statut === "confirme"
                            ? "bg-blue/20 text-blue"
                            : "bg-danger/20 text-danger"
                      }`}
                      title={`${cat?.label ?? a.equipe.categorie} · ${a.heure} · ${STATUT_ANNONCE_LABEL[a.statut as keyof typeof STATUT_ANNONCE_LABEL] ?? a.statut}`}
                    >
                      {cat?.label ?? a.equipe.categorie}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
