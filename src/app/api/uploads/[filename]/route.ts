import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

// Sert une LICENCE (fichier privé) stockée dans le bucket Supabase "licences".
// Authentification + autorisation requises : seuls l'admin (consulte toute
// licence) et le propriétaire du fichier peuvent le télécharger. Évite l'IDOR
// (un club connecté ne peut pas récupérer la licence d'un autre club).

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  // Authentification requise
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { filename } = await params;

  // Autorisation : admin (toute licence) ou propriétaire du fichier.
  const isOwner = session.club.licenceFichierUrl?.endsWith(`/api/uploads/${filename}`);
  if (session.club.role !== "admin" && !isOwner) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  // Protection contre le path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Nom de fichier invalide" }, { status: 400 });
  }

  const ext = "." + (filename.split(".").pop() ?? "").toLowerCase();
  const contentType = MIME_MAP[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Type de fichier non autorisé" }, { status: 400 });
  }

  const { data, error } = await getSupabase().storage.from("licences").download(filename);
  if (error || !data) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const bytes = await data.arrayBuffer();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}