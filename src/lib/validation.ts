// Validation centralisée des entrées serveur — source unique de vérité.

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// --- Limites de longueur ---
export const LIMITS = {
  NOM_MAX: 100,
  VILLE_MAX: 100,
  TELEPHONE_MAX: 20,
  EMAIL_MAX: 254,
  STADE_NOM_MAX: 200,
  NOTE_MAX: 2000,
  MESSAGE_MAX: 2000,
  REFUS_MOTIF_MAX: 500,
  ADVERSAIRE_NOM_MAX: 100,
  SCORE_MAX: 99,
  COMMENTAIRE_MAX: 500,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128, // prévention DoS bcrypt
} as const;

// --- Date : YYYY-MM-DD ---
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// --- Heure : HH:mm ou plage HH:mm-HH:mm ---
export function isValidHeure(value: string): boolean {
  const hhmm = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (hhmm.test(value)) return true;
  const parts = value.split("-");
  if (parts.length === 2 && hhmm.test(parts[0]) && hhmm.test(parts[1])) return true;
  return false;
}

// Normalise un jeton d'heure saisi librement :
//   "13"   -> "13:00"
//   "9"    -> "09:00"
//   "13h"  -> "13:00"
//   "13h30"-> "13:30"
// Les formats déjà valides (HH:mm) sont renvoyés tels quels ; les formats
// non reconnus aussi (la validation isValidHeure tranchera ensuite).
function normalizeTimeToken(tok: string): string {
  const s = tok.trim().toLowerCase();
  if (/^\d{1,2}$/.test(s)) return s.padStart(2, "0") + ":00";
  const m = s.match(/^(\d{1,2})h(\d{1,2})?$/);
  if (m) return m[1].padStart(2, "0") + ":" + (m[2] ? m[2].padStart(2, "0") : "00");
  return s;
}

// Normalise une heure ou une plage (ex. "13-15" -> "13:00-15:00").
export function normalizeHeure(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  if (s.includes("-")) return s.split("-").map(normalizeTimeToken).join("-");
  return normalizeTimeToken(s);
}

// --- Code postal français : 5 chiffres (01000–95999) ---
export function isValidCodePostal(value: string): boolean {
  if (!/^\d{5}$/.test(value)) return false;
  const n = parseInt(value, 10);
  return n >= 1000 && n <= 95999;
}

// --- Téléphone français ---
export function isValidTelephone(value: string): boolean {
  const digits = value.replace(/[\s.\-()]/g, "");
  return /^(\+33|0)\d{9}$/.test(digits);
}

// --- Email ---
// Regex stricte rejetant les caractères de contrôle, exigeant au moins un
// caractère avant/after @ et un TLD d'au moins 2 lettres.
export function isValidEmail(value: string): boolean {
  if (value.length > LIMITS.EMAIL_MAX) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(value);
}

// --- Mot de passe ---
// Exige au moins 8 caractères et 3 des 4 familles suivantes :
// minuscule, majuscule, chiffre, symbole.
export function validatePassword(value: string): ValidationResult {
  if (value.length < LIMITS.PASSWORD_MIN) {
    return { valid: false, error: `Le mot de passe doit faire au moins ${LIMITS.PASSWORD_MIN} caractères.` };
  }
  if (value.length > LIMITS.PASSWORD_MAX) {
    return { valid: false, error: `Le mot de passe ne doit pas dépasser ${LIMITS.PASSWORD_MAX} caractères.` };
  }

  const families = [
    /[a-z]/,
    /[A-Z]/,
    /\d/,
    /[^A-Za-z0-9]/,
  ];
  const matched = families.filter((re) => re.test(value)).length;
  if (matched < 3) {
    return {
      valid: false,
      error:
        "Le mot de passe doit contenir au moins 3 des 4 types de caractères : minuscule, majuscule, chiffre, symbole.",
    };
  }

  return { valid: true };
}

// --- Longueur de chaîne ---
export function validateLength(value: string, field: string, max: number): ValidationResult {
  if (value.length > max) {
    return { valid: false, error: `${field} ne doit pas dépasser ${max} caractères.` };
  }
  return { valid: true };
}