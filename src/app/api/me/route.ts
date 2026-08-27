import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, hashOpaqueToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface MeResponse {
  club: {
    id: string;
    nom: string;
    role: "club" | "admin";
  } | null;
}

export async function GET(): Promise<NextResponse<MeResponse>> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ club: null });
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
  });

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ club: null });
  }

  const club = await prisma.club.findUnique({
    where: { id: session.clubId },
    select: { id: true, nom: true, role: true },
  });

  if (!club) {
    return NextResponse.json({ club: null });
  }

  return NextResponse.json({
    club: {
      id: club.id,
      nom: club.nom,
      role: club.role as "club" | "admin",
    },
  });
}
