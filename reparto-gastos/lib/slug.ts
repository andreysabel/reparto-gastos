import { randomInt } from "node:crypto";

const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** "Viaje a Lisboa 2026!" → "viaje-a-lisboa-2026" */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Slug legible + sufijo aleatorio, p. ej. "viaje-a-lisboa-k3f9x2".
 * El sufijo evita colisiones entre grupos con el mismo nombre y hace que la
 * URL no sea adivinable (es la "llave" de acceso al grupo).
 */
export function generateGroupSlug(name: string): string {
  // Solo [a-z0-9] para que pase SLUG_PATTERN (base64url podía generar "_").
  const suffix = Array.from(
    { length: 6 },
    () => SUFFIX_ALPHABET[randomInt(SUFFIX_ALPHABET.length)],
  ).join("");
  const base = slugify(name) || "grupo";
  return `${base}-${suffix}`;
}

export const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;
