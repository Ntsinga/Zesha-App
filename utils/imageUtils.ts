/**
 * Image utility functions for handling balance images
 */

import type { Balance } from "../types";

/**
 * Get the image source for a balance
 * Returns either a base64 data URI (for mobile app uploads) or a regular URI (for WhatsApp)
 */
export function getBalanceImageSource(balance: Balance): string | null {
  // Priority 1: Use base64 imageData if available (mobile app uploads)
  if (balance.imageData) {
    // Determine MIME type from imageUrl if it contains extension info
    const mimeType = balance.imageUrl?.includes(".png")
      ? "image/png"
      : balance.imageUrl?.includes(".gif")
        ? "image/gif"
        : balance.imageUrl?.includes(".webp")
          ? "image/webp"
          : "image/jpeg";

    return `data:${mimeType};base64,${balance.imageData}`;
  }

  // Priority 2: Use imageUrl if it's a valid HTTP/HTTPS URL (WhatsApp images)
  if (
    balance.imageUrl &&
    (balance.imageUrl.startsWith("http://") ||
      balance.imageUrl.startsWith("https://"))
  ) {
    return balance.imageUrl;
  }

  // No valid image source
  return null;
}

/**
 * Check if a balance has a viewable image
 */
export function hasBalanceImage(balance: Balance): boolean {
  return getBalanceImageSource(balance) !== null;
}

/**
 * Get image display info for UI
 */
export function getBalanceImageInfo(balance: Balance): {
  hasImage: boolean;
  source: string | null;
  sourceType: "mobile" | "whatsapp" | "none";
} {
  const source = getBalanceImageSource(balance);

  if (!source) {
    return { hasImage: false, source: null, sourceType: "none" };
  }

  const sourceType = balance.source === "mobile_app" ? "mobile" : "whatsapp";

  return {
    hasImage: true,
    source,
    sourceType,
  };
}
