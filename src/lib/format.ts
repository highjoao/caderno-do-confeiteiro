export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const formatDate = (date: string): string => {
  return new Date(date + "T00:00:00").toLocaleDateString("pt-BR");
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
    // Cost per gram/ml can be very small — show up to 4 decimals
    return `R$ ${formatDecimal(value, 4)}/${unit}`;
  }
  // Kg, L, Unidade — 2 decimals
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
  // g, ml — no unnecessary decimals
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
  // If the recipe unit matches insumo unit, straightforward
  if (unidadeReceita === unidadeInsumo || !unidadeReceita) {
    return custoUnidade * quantidade;
  }

  // Weight conversions
  if (unidadeReceita === "Kg" && (unidadeInsumo === "g" || unidadeInsumo === "Kg")) {
    return custoGrama * quantidade * 1000;
  }
  if (unidadeReceita === "g" && (unidadeInsumo === "g" || unidadeInsumo === "Kg")) {
    return custoGrama * quantidade;
  }

  // Volume conversions (treat ml cost like g cost)
  if (unidadeReceita === "L" && (unidadeInsumo === "ml" || unidadeInsumo === "L")) {
    return custoGrama * quantidade * 1000;
  }
  if (unidadeReceita === "ml" && (unidadeInsumo === "ml" || unidadeInsumo === "L")) {
    return custoGrama * quantidade;
  }

  // Fallback: use unit cost
  return custoUnidade * quantidade;
};
