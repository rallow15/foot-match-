"use client";

import Link from "next/link";

interface PaginationProps {
  page: number;
  totalPages: number;
  filters: Record<string, string | undefined>;
}

export function Pagination({ page, totalPages, filters }: PaginationProps) {
  if (totalPages <= 1) return null;

  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });

  function href(p: number) {
    if (p === 1) {
      query.delete("page");
    } else {
      query.set("page", String(p));
    }
    const qs = query.toString();
    return `/annonces${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="btn-ghost px-4 py-2 text-sm"
          prefetch={false}
        >
          ← Précédent
        </Link>
      ) : (
        <span className="pointer-events-none opacity-40 btn-ghost px-4 py-2 text-sm">
          ← Précédent
        </span>
      )}
      <span className="text-sm text-muted">
        Page {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className="btn-ghost px-4 py-2 text-sm"
          prefetch={false}
        >
          Suivant →
        </Link>
      ) : (
        <span className="pointer-events-none opacity-40 btn-ghost px-4 py-2 text-sm">
          Suivant →
        </span>
      )}
    </div>
  );
}
