import { NextRequest, NextResponse } from "next/server";
import { autocompleteVilles } from "@/lib/geo";
import { rateLimit, GEO_AUTOCOMPLETE_RATE_LIMIT } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  if (!(await rateLimit(ip, "geo-autocomplete", GEO_AUTOCOMPLETE_RATE_LIMIT))) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await autocompleteVilles(q);
  return NextResponse.json({ results });
}
