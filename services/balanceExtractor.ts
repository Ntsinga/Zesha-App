/**
 * Balance Extraction Service - Backend API Integration
 *
 * This service calls the backend /extraction/extract endpoint which handles
 * AI-powered balance/commission extraction using Gemini and OpenAI.
 *
 * All AI API keys are securely stored on the backend.
 */
import * as FileSystem from "expo-file-system/legacy";
import { API_BASE_URL, API_ENDPOINTS } from "../config/api";
import { secureApi, ApiError, isSecureApiInitialized } from "./secureApi";

export type ExtractionType = "balance" | "commission";

export interface BalanceExtractionResult {
  balance: number | null;
  success: boolean;
  error?: string;
  provider?: string;
}

// Backend API response interface
interface ExtractionApiResponse {
  balance: number | null;
  success: boolean;
  error?: string;
  provider?: string;
}

/**
 * Convert a local image URI to base64
 */
async function imageToBase64(imageUri: string): Promise<string> {
  try {
    if (__DEV__) {
      console.log("[BalanceExtractor] Reading image from URI:", imageUri);
    }
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (__DEV__) {
      console.log(
        "[BalanceExtractor] Image converted to base64, length:",
        base64.length,
      );
    }
    return base64;
  } catch (error) {
    console.error("[BalanceExtractor] Failed to read image file:", error);
    throw new Error(
      `Failed to read image file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

/**
 * Get MIME type from image URI
 */
function getMimeType(imageUri: string): string {
  const extension = imageUri.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

/**
 * Extract balance from an image using the backend AI extraction service
 *
 * The backend handles:
 * - Primary: Google Gemini 2.0 Flash
 * - Fallback: OpenAI GPT-4o-mini
 */
export async function extractBalanceFromImage(
  imageUri: string,
  type: ExtractionType = "balance",
): Promise<BalanceExtractionResult> {
  if (__DEV__) {
    console.log(
      `[BalanceExtractor] Starting ${type} extraction for image:`,
      imageUri,
    );
  }

  try {
    // Check if secure API is initialized
    if (!isSecureApiInitialized()) {
      return {
        balance: null,
        success: false,
        error: "Authentication not initialized. Please sign in again.",
      };
    }

    // Convert image to base64
    const base64Image = await imageToBase64(imageUri);
    const mimeType = getMimeType(imageUri);

    if (__DEV__) {
      console.log("[BalanceExtractor] MIME type:", mimeType);
      console.log("[BalanceExtractor] Calling backend extraction API...");
    }

    // Call backend extraction endpoint
    const response = await secureApi.post<ExtractionApiResponse>(
      API_ENDPOINTS.extraction.extract,
      {
        image_data: base64Image,
        mime_type: mimeType,
        extraction_type: type,
      },
    );

    if (__DEV__) {
      console.log("[BalanceExtractor] Backend response:", {
        balance: response.balance,
        success: response.success,
        provider: response.provider,
      });
    }

    return {
      balance: response.balance,
      success: response.success,
      error: response.error,
      provider: response.provider,
    };
  } catch (error) {
    console.error("[BalanceExtractor] ✗ Extraction failed:", error);

    // Handle specific API errors
    if (error instanceof ApiError) {
      if (error.code === "UNAUTHORIZED") {
        return {
          balance: null,
          success: false,
          error: "Session expired. Please sign in again.",
        };
      }
      if (error.code === "FORBIDDEN") {
        return {
          balance: null,
          success: false,
          error: "You don't have permission to use this feature.",
        };
      }
      return {
        balance: null,
        success: false,
        error: error.message,
      };
    }

    return {
      balance: null,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Compare extracted balance with user input
 * Returns validation result
 */
export interface BalanceValidationResult {
  isValid: boolean;
  extractedBalance: number | null;
  inputBalance: number;
  difference: number | null;
  message: string;
}

export function validateBalance(
  extractedBalance: number | null,
  inputBalance: number,
): BalanceValidationResult {
  if (extractedBalance === null) {
    return {
      isValid: false,
      extractedBalance: null,
      inputBalance,
      difference: null,
      message: "Could not extract balance from image",
    };
  }

  const difference = Math.abs(extractedBalance - inputBalance);

  // Allow for small rounding differences (within 1 unit)
  if (difference <= 1) {
    return {
      isValid: true,
      extractedBalance,
      inputBalance,
      difference: 0,
      message: "Balance verified successfully",
    };
  }

  return {
    isValid: false,
    extractedBalance,
    inputBalance,
    difference,
    message: `Balance mismatch! Image shows ${extractedBalance.toLocaleString()}, but you entered ${inputBalance.toLocaleString()}. Difference: ${difference.toLocaleString()}`,
  };
}
