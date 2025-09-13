/**
 * Безопасное форматирование чисел для Learn страницы
 * Исправляет проблемы с NaN значениями
 */

export function safeNumber(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return "—";
  }
  return Number(value).toLocaleString();
}

export function safeNumberWithUnit(value?: number | null, unit: string = ""): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return `— ${unit}`.trim();
  }
  return `${Number(value).toLocaleString()} ${unit}`.trim();
}

export function safePercentage(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return "—%";
  }
  return `${Number(value).toFixed(1)}%`;
}

export function formatTokenAmount(amount?: number, decimals: number = 9): string {
  if (amount === null || amount === undefined || Number.isNaN(amount) || !Number.isFinite(amount)) {
    return "—";
  }
  
  const formatted = (Number(amount) / Math.pow(10, decimals)).toFixed(decimals === 9 ? 4 : 2);
  return Number(formatted).toLocaleString();
}

export function formatLargeNumber(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return "—";
  }
  
  const num = Number(value);
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  
  return num.toLocaleString();
}
