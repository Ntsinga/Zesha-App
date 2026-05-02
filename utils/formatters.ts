/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - Currency code (default: USD)
 * @param locale - Locale for formatting (default: en-US)
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  const safeNum = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeNum);
}

/**
 * Format a number in compact notation (e.g., $15.5k)
 * @param amount - The amount to format
 * @param currency - Currency symbol (default: $)
 */
export function formatCompactCurrency(
  amount: number | string | null | undefined,
  currencySymbol: string = "$",
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  const safeNum = isNaN(num) ? 0 : num;

  if (Math.abs(safeNum) >= 1000000) {
    return `${currencySymbol}${(safeNum / 1000000).toFixed(1)}m`;
  }
  if (Math.abs(safeNum) >= 1000) {
    return `${currencySymbol}${(safeNum / 1000).toFixed(1)}k`;
  }
  return `${currencySymbol}${safeNum.toFixed(2)}`;
}

/**
 * Format a date string
 * @param dateString - ISO date string or Date object
 * @param format - Format type: 'short', 'medium', 'long'
 */
export function formatDate(
  dateString: string | Date,
  format: "short" | "medium" | "long" = "medium",
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
 * Format a date+time string (e.g., "28 Feb, 14:30")
 * @param isoString - ISO date/time string
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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
 * Format a raw numeric string for display in an amount input field.
 * Adds thousands separators while preserving trailing decimal editing.
 * Returns an empty string for empty/invalid input.
 */
export function formatAmountInput(raw: string): string {
  if (!raw || raw === "") return "";
  const num = parseFloat(raw);
  if (isNaN(num)) return raw;
  // Preserve a trailing decimal point or trailing zeros so the user can keep typing
  const hasTrailingDot = raw.endsWith(".");
  const trailingDecimals = raw.includes(".") ? raw.split(".")[1] : null;
  const intPart = Math.floor(Math.abs(num));
  const intFormatted = intPart.toLocaleString("en-US");
  if (hasTrailingDot) return `${intFormatted}.`;
  if (trailingDecimals !== null && trailingDecimals.length > 0) {
    // Format the integer part with commas, keep the decimal digits as typed
    return `${intFormatted}.${trailingDecimals}`;
  }
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * Parse a user-typed amount string (possibly with commas) into a clean numeric string.
 * Returns the cleaned string if valid, or null if the input is not a valid number.
 */
export function parseAmountInput(value: string): string | null {
  const clean = value.replace(/,/g, "");
  if (clean === "" || clean === ".") return clean;
  if (!/^\d*\.?\d*$/.test(clean)) return null;
  return clean;
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
