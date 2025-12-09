import { useSelector } from "react-redux";
import type { RootState } from "../store";

// Currency symbol mapping for compact display
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  UGX: "USh",
  KES: "KSh",
  TZS: "TSh",
  RWF: "RF",
  ZAR: "R",
  NGN: "₦",
  GHS: "GH₵",
  INR: "₹",
  CNY: "¥",
  JPY: "¥",
};

// Default currency if none set
const DEFAULT_CURRENCY = "UGX";

/**
 * Hook to get the company currency from Redux store
 * Returns the currency code from company info, or default if not set
 */
export function useCompanyCurrency(): string {
  const companyInfo = useSelector(
    (state: RootState) => state.dashboard.companyInfo
  );
  return companyInfo?.currency || DEFAULT_CURRENCY;
}

/**
 * Hook that provides currency formatting functions using company currency
 */
export function useCurrencyFormatter() {
  const currency = useCompanyCurrency();
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  const formatCurrency = (
    amount: number | string | null | undefined,
    locale: string = "en-US"
  ): string => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
    const safeNum = isNaN(num) ? 0 : num;

    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(safeNum);
    } catch {
      // Fallback for unsupported currencies
      return `${symbol}${safeNum.toLocaleString(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    }
  };

  const formatCompactCurrency = (
    amount: number | string | null | undefined
  ): string => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
    const safeNum = isNaN(num) ? 0 : num;

    if (Math.abs(safeNum) >= 1000000) {
      return `${symbol}${(safeNum / 1000000).toFixed(1)}m`;
    }
    if (Math.abs(safeNum) >= 1000) {
      return `${symbol}${(safeNum / 1000).toFixed(1)}k`;
    }
    return `${symbol}${safeNum.toFixed(0)}`;
  };

  return {
    currency,
    symbol,
    formatCurrency,
    formatCompactCurrency,
  };
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}

/**
 * Get default currency
 */
export function getDefaultCurrency(): string {
  return DEFAULT_CURRENCY;
}
