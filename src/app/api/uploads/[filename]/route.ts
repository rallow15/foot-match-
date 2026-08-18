import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { prisma } from "@/lib/db";

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
  const { filename } = await params;

  // Protection contre le path traversal (avant tout accès DB / Storage)
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Nom de fichier invalide" }, { status: 400 });
  }

  // Authentification requise
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Autorisation : admin (toute licence) ou propriétaire du fichier.
  const club = await prisma.club.findUnique({
    where: { id: session.clubId },
    select: { role: true, licenceFichierUrl: true },
  });
  if (!club) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const isOwner = club.licenceFichierUrl?.endsWith(`/api/uploads/${filename}`);
  if (club.role !== "admin" && !isOwner) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
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
  // Sanitize du nom pour l'en-tête Content-Disposition (défense en profondeur).
  const safeFilename = filename.replace(/["\r\n]/g, "_");
  // Les licences sont servies en attachment pour réduire la surface d'attaque
  // du visualiseur PDF intégré (JS embarqué possible selon le navigateur).
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
