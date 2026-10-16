/**
 * Utilidades de dinero. Internamente todo son céntimos enteros; los
 * decimales solo existen en la entrada del usuario y en la presentación.
 */

const AMOUNT_PATTERN = /^(\d{1,9})(?:[.,](\d{1,2}))?$/;

/**
 * Convierte la entrada del usuario ("12", "12.5", "12,50") a céntimos
 * parseando el texto, sin pasar nunca por aritmética de coma flotante.
 * Devuelve null si el formato no es válido o el importe no es positivo.
 */
export function parseAmountToCents(input: string): number | null {
  const match = AMOUNT_PATTERN.exec(input.trim());
  if (!match) return null;

  const euros = Number(match[1]);
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  const total = euros * 100 + cents;

  return total > 0 ? total : null;
}

const formatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

/** Formatea céntimos como moneda. La división es solo para mostrar. */
export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}
