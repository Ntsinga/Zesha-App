/**
 * Image utility functions for handling balance images
 */

import type { Balance } from "../types";

/**
 * Get the image source for a balance
 * Returns either a base64 data URI (for mobile app uploads) or a regular URI (for WhatsApp)
 */
export function getBalanceImageSource(balance: Balance): string | null {
  // Priority 1: Use base64 image_data if available (mobile app uploads)
  if (balance.image_data) {
    // Determine MIME type from image_url if it contains extension info
    const mimeType = balance.image_url?.includes(".png")
      ? "image/png"
      : balance.image_url?.includes(".gif")
      ? "image/gif"
      : balance.image_url?.includes(".webp")
      ? "image/webp"
      : "image/jpeg";

    return `data:${mimeType};base64,${balance.image_data}`;
  }

  // Priority 2: Use image_url if it's a valid HTTP/HTTPS URL (WhatsApp images)
  if (
    balance.image_url &&
    (balance.image_url.startsWith("http://") ||
      balance.image_url.startsWith("https://"))
  ) {
    return balance.image_url;
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
