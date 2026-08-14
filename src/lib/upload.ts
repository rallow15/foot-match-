// Upload sécurisé vers Supabase Storage — validation magic bytes + taille.
//  - logos    -> bucket public  "logos"    : renvoie l'URL publique (CDN Supabase)
//  - licences -> bucket privé   "licences" : renvoie /api/uploads/<name> (servi après authz)
import { randomBytes } from "node:crypto";
import { getSupabase, BUCKETS, type UploadPrefix } from "@/lib/supabase";

const MAX_SIZE = 8 * 1024 * 1024; // 8 Mo

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"] as const;
type AllowedExt = (typeof ALLOWED_EXTENSIONS)[number];

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Signatures magic bytes (premiers octets du fichier)
const MAGIC_BYTES: Record<string, number[][]> = {
  ".pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
  ".jpg": [[0xff, 0xd8, 0xff]],
  ".jpeg": [[0xff, 0xd8, 0xff]],
  ".png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ".webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF (vérification WEBP supplémentaire ci-dessous)
};

function matchesMagicBytes(buffer: Buffer, ext: string): boolean {
  const signatures = MAGIC_BYTES[ext];
  if (!signatures) return false;
  return signatures.some((sig) => {
    if (buffer.length < sig.length) return false;
    return sig.every((byte, i) => buffer[i] === byte);
  });
}

function isWebP(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  return (
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  );
}

function isAllowedExt(ext: string): ext is AllowedExt {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

export async function saveUpload(
  file: File | null | undefined,
  prefix: UploadPrefix,
): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;

  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  if (!isAllowedExt(ext)) {
    throw new Error("Format de fichier non autorisé.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("Fichier trop volumineux (max 8 Mo).");
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // Validation magic bytes
  if (ext === ".webp") {
    if (!matchesMagicBytes(buf, ext) || !isWebP(buf)) {
      throw new Error("Le fichier ne correspond pas au format déclaré (signature invalide).");
    }
  } else {
    if (!matchesMagicBytes(buf, ext)) {
      throw new Error("Le fichier ne correspond pas au format déclaré (signature invalide).");
    }
  }

  const bucket = BUCKETS[prefix];
  const name = `${prefix}_${randomBytes(6).toString("hex")}${ext}`;

  const { error } = await getSupabase()
    .storage.from(bucket.name)
    .upload(name, buf, { contentType: MIME[ext], upsert: false });

  if (error) {
    throw new Error("Erreur lors de l'enregistrement du fichier.");
  }

  if (bucket.public) {
    const { data } = getSupabase().storage.from(bucket.name).getPublicUrl(name);
    return data.publicUrl;
  }
  // Bucket privé : servi via la route authentifiée /api/uploads/<name>.
  return `/api/uploads/${name}`;
}