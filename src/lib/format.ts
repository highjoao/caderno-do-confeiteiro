export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

/**
 * Formats a date string for display in pt-BR locale.
 * Handles both date-only strings (YYYY-MM-DD) and full ISO timestamps.
 * Uses explicit timezone to prevent mobile date shifting.
 */
export const formatDate = (date: string): string => {
  if (!date) return "";
  // If it's a date-only string (YYYY-MM-DD), parse parts manually to avoid timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-");
    return `${d}/${m}/${y}`;
  }
  // Full timestamp — use locale formatting with explicit timezone
  return new Date(date).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
};

/**
 * Formats a full timestamp (date + time) for display.
 */
export const formatDateTime = (date: string): string => {
  if (!date) return "";
  return new Date(date).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
};

/**
 * Returns a YYYY-MM-DD string from the current local date,
 * safe for <input type="date"> default values.
 */
export const todayDateString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

/**
 * Returns a YYYY-MM-DDTHH:mm string for <input type="datetime-local"> default values.
 */
export const nowDateTimeString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const toNumber = (val: unknown): number => {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val) || 0;
  return 0;
};

/** Format a decimal number removing unnecessary trailing zeros */
export const formatDecimal = (value: number, maxDecimals: number = 2): string => {
  return parseFloat(value.toFixed(maxDecimals)).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
};

/** Format cost per unit with appropriate decimal places based on unit */
export const formatCostPerUnit = (value: number, unit: string): string => {
  if (unit === "g" || unit === "ml") {
    return `R$ ${formatDecimal(value, 4)}/${unit}`;
  }
  return `R$ ${formatDecimal(value, 2)}/${unit}`;
};

/** Format quantity based on unit type */
export const formatQuantidade = (value: number, unit: string): string => {
  if (unit === "Unidade") {
    return String(Math.round(value));
  }
  if (unit === "Kg" || unit === "L") {
    return formatDecimal(value, 3);
  }
  return formatDecimal(value, 2);
};

/** Convert quantity between units and return the cost */
export const convertAndCalcCost = (
  quantidade: number,
  unidadeReceita: string,
  custoGrama: number,
  custoUnidade: number,
  unidadeInsumo: string
): number => {
  if (unidadeReceita === unidadeInsumo || !unidadeReceita) {
    return custoUnidade * quantidade;
  }
  if (unidadeReceita === "Kg" && (unidadeInsumo === "g" || unidadeInsumo === "Kg")) {
    return custoGrama * quantidade * 1000;
  }
  if (unidadeReceita === "g" && (unidadeInsumo === "g" || unidadeInsumo === "Kg")) {
    return custoGrama * quantidade;
  }
  if (unidadeReceita === "L" && (unidadeInsumo === "ml" || unidadeInsumo === "L")) {
    return custoGrama * quantidade * 1000;
  }
  if (unidadeReceita === "ml" && (unidadeInsumo === "ml" || unidadeInsumo === "L")) {
    return custoGrama * quantidade;
  }
  return custoUnidade * quantidade;
};
