'use client';

import { useLocale } from 'next-intl';

/**
 * Hook for formatting dates according to the current locale
 * English: MM/DD/YYYY
 * Polish: DD.MM.YYYY
 */
export function useFormattedDate() {
  const locale = useLocale();
  
  return (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  };
}

/**
 * Hook for formatting numbers according to the current locale
 * English: 12.50% ($45.00)
 * Polish: 12,50% ($45,00)
 */
export function useFormattedNumber() {
  const locale = useLocale();
  
  return {
    percent: (value: number) => {
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    },
    currency: (value: number) => {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    }
  };
}
