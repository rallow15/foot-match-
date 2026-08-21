import { NextResponse } from "next/server";
import { getCurrentClub } from "@/lib/auth";

export async function GET() {
  const club = await getCurrentClub();
  if (!club) return NextResponse.json(null);
  return NextResponse.json({ id: club.id, nom: club.nom, role: club.role });
}
