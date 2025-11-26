/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - Currency code (default: USD)
 * @param locale - Locale for formatting (default: en-US)
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number in compact notation (e.g., $15.5k)
 * @param amount - The amount to format
 * @param currency - Currency symbol (default: $)
 */
export function formatCompactCurrency(
  amount: number,
  currencySymbol: string = "$"
): string {
  if (Math.abs(amount) >= 1000000) {
    return `${currencySymbol}${(amount / 1000000).toFixed(1)}m`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${currencySymbol}${(amount / 1000).toFixed(1)}k`;
  }
  return `${currencySymbol}${amount.toFixed(2)}`;
}

/**
 * Format a date string
 * @param dateString - ISO date string or Date object
 * @param format - Format type: 'short', 'medium', 'long'
 */
export function formatDate(
  dateString: string | Date,
  format: "short" | "medium" | "long" = "medium"
): string {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;

  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: "numeric", day: "numeric", year: "2-digit" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  };

  return new Intl.DateTimeFormat("en-US", formatOptions[format]).format(date);
}

/**
 * Format a date as relative time (e.g., "2 days ago")
 * @param dateString - ISO date string or Date object
 */
export function formatRelativeTime(dateString: string | Date): string {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  return formatDate(date, "medium");
}

/**
 * Format a percentage
 * @param value - The decimal value (e.g., 0.15 for 15%)
 * @param decimals - Number of decimal places
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Truncate text with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Capitalize the first letter of a string
 * @param text - The text to capitalize
 */
export function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Format a phone number
 * @param phone - The phone number to format
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}
