/**
 * Masks raw input into pt-BR currency format.
 * - Digits starting with "0" are treated as cents (divided by 100).
 * - Other digits are treated as whole numbers with 2 decimal places.
 *
 * Examples: "1" → "1,00", "010" → "0,10", "1000" → "1.000,00"
 */
export function maskCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) {
    return (Number(digits) / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return Number(digits).toLocaleString("pt-BR", {
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
