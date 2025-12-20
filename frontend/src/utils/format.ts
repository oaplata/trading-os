/**
 * Utilidades para formatear valores
 */

/**
 * Formatea un monto como moneda
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'COP' ? 0 : 2,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(amount);
}

/**
 * Formatea una fecha
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '-';
  
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Formatea una fecha solo con fecha (sin hora)
 */
export function formatDateOnly(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '-';
  
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
}

/**
 * Formatea un drawdown como porcentaje
 */
export function formatDrawdown(drawdown: number | null | undefined): string {
  if (drawdown === null || drawdown === undefined) return '-';
  return `${drawdown.toFixed(2)}%`;
}

/**
 * Formatea un porcentaje
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(2)}%`;
}

