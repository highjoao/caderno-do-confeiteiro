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
