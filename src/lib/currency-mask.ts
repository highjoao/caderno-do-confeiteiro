/**
 * Masks raw input into pt-BR currency format.
 * All digits are treated as cents (divided by 100).
 *
 * Examples: "1" → "0,01", "10" → "0,10", "100" → "1,00", "100000" → "1.000,00"
 */
export function maskCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const number = Number(digits) / 100;
  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Converts a pt-BR formatted currency string back to a number.
 * "1.250,50" → 1250.5
 */
export function parseCurrency(formatted: string): number {
  if (!formatted) return 0;
  return Number(formatted.replace(/\./g, "").replace(",", ".")) || 0;
}

/**
 * Converts a numeric value to a masked currency string for editing.
 * Used when loading existing data into edit forms.
 */
export function numberToMask(value: number): string {
  if (!value && value !== 0) return "";
  if (value === 0) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
