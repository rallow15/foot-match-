"use client";

import { useEffect, useRef, useState } from "react";
import { autocompleteVilles, type GeoResult } from "@/lib/geo";

interface Props {
  initialVille?: string;
  initialLat?: string;
  initialLng?: string;
  initialRayon?: string;
}

export function VilleAutocomplete({
  initialVille = "",
  initialLat = "",
  initialLng = "",
  initialRayon = "",
}: Props) {
  const [q, setQ] = useState(initialVille);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      if (q.trim().length < 3) {
        setResults([]);
        return;
      }
      const r = await autocompleteVilles(q);
      if (active) {
        setResults(r);
        setOpen(true);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  function choose(g: GeoResult) {
    setQ(g.label);
    setLat(String(g.latitude));
    setLng(String(g.longitude));
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end">
      <div className="flex-1" ref={boxRef}>
        <label className="label" htmlFor="ville">Ville / code postal</label>
        <div className="relative">
          <input
            id="ville"
            name="ville"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder="Ex. Lyon, 69000…"
            className="input"
            autoComplete="off"
          />
          {open && results.length > 0 && (
            <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-sm border border-line bg-ink-3 shadow-xl">
              {results.map((r) => (
                <li key={`${r.codePostal}-${r.ville}-${r.latitude}`}>
                  <button
                    type="button"
                    onClick={() => choose(r)}
                    className="block w-full px-3 py-2 text-left text-sm text-paper hover:bg-ink-4"
                  >
                    <span className="text-paper">{r.ville}</span>{" "}
                    <span className="text-muted-2">({r.codePostal})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <input type="hidden" name="latitude" value={lat} />
        <input type="hidden" name="longitude" value={lng} />
      </div>
      <div className="sm:w-32">
        <label className="label" htmlFor="rayon">Rayon (km)</label>
        <input
          id="rayon"
          name="rayon"
          type="number"
          min={1}
          defaultValue={initialRayon || "20"}
          className="input"
        />
      </div>
    </div>
  );
}