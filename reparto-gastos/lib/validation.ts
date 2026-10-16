export const MAX_NAME_LENGTH = 40;
export const MAX_DESCRIPTION_LENGTH = 100;

/** Recorta y colapsa espacios: "  Ana   María " → "Ana María". */
export function normalizeText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/** "Ana, Luis\nEva" → ["Ana", "Luis", "Eva"], sin duplicados (ignorando mayúsculas). */
export function parseMemberList(raw: string): string[] {
  const seen = new Set<string>();
  const members: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const name = normalizeText(part);
    const key = name.toLocaleLowerCase("es");
    if (name && !seen.has(key)) {
      seen.add(key);
      members.push(name);
    }
  }
  return members;
}

export function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, "es", { sensitivity: "accent" }) === 0;
}
