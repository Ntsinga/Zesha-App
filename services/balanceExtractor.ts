// Balance Extraction Service using Google Gemini API with OpenAI GPT-4 Vision fallback
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";
import { GoogleGenAI } from "@google/genai";

// API Configuration
const GEMINI_API_KEY =
  Constants.expoConfig?.extra?.geminiApiKey ||
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  "";

const OPENAI_API_KEY =
  Constants.expoConfig?.extra?.openaiApiKey ||
  process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
  "";

console.log(
  "[BalanceExtractor] Gemini API Key configured:",
  GEMINI_API_KEY
    ? `${GEMINI_API_KEY.substring(0, 10)}... (length: ${GEMINI_API_KEY.length})`
    : "NOT SET"
);

console.log(
  "[BalanceExtractor] OpenAI API Key configured:",
  OPENAI_API_KEY
    ? `${OPENAI_API_KEY.substring(0, 10)}... (length: ${OPENAI_API_KEY.length})`
    : "NOT SET (fallback disabled)"
);

// Initialize Gemini client
const getGeminiClient = () => {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
};

// System prompts for extraction
const BALANCE_SYSTEM_PROMPT = `You are a strict extractor. Return ONLY a JSON object with a single key "balance" and a numeric value (or null).

Rules:
1) Find the number for "Account Balance" (case-insensitive).
2) If BOTH "Account Balance" and "Available Balance" are present:
   - If equal → use that number.
   - If different → choose the larger number.
3) Read the number immediately after the label's colon.
4) Remove commas, spaces, and currency symbols. Output an INTEGER (no quotes).
5) If no balance is clearly visible → output {"balance": null}.
6) Output NOTHING except this one JSON object.`;

const COMMISSION_SYSTEM_PROMPT = `You are a strict extractor. Return ONLY a JSON object with a single key "balance" and a numeric value (or null).

Rules:
1) Find the number for "Commission" or "total commission" (case-insensitive).
2) This is typically a commission amount from mobile money or banking services.
3) Look for phrases like:
   - "commission is UGX [amount]"
   - "total commission: [amount]"
   - "your commission [amount]"
   - "withdraw commission is [amount]"
   - "deposit and withdraw commission is [amount]"
4) Read the number immediately after these labels.
5) Remove commas, spaces, and currency symbols. Output an INTEGER (no quotes).
6) If no commission amount is clearly visible → output {"balance": null}.
7) Output NOTHING except this one JSON object.`;

export type ExtractionType = "balance" | "commission";

export interface BalanceExtractionResult {
  balance: number | null;
  success: boolean;
  error?: string;
}

/**
 * Convert a local image URI to base64
 */
async function imageToBase64(imageUri: string): Promise<string> {
  try {
    console.log("[BalanceExtractor] Reading image from URI:", imageUri);
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(
      "[BalanceExtractor] Image converted to base64, length:",
      base64.length
    );
    return base64;
  } catch (error) {
    console.error("[BalanceExtractor] Failed to read image file:", error);
    throw new Error(
      `Failed to read image file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
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
 * Parse balance from AI response text
 */
function parseBalanceResponse(textResponse: string): BalanceExtractionResult {
  try {
    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = textResponse.trim();
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith("```")) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();
    console.log("[BalanceExtractor] Cleaned response:", cleanedResponse);

    const parsed = JSON.parse(cleanedResponse);
    console.log("[BalanceExtractor] Parsed JSON:", parsed);

    if (typeof parsed.balance === "number") {
      console.log(
        "[BalanceExtractor] ✓ Successfully extracted balance:",
        parsed.balance
      );
      return {
        balance: parsed.balance,
        success: true,
      };
    } else if (parsed.balance === null) {
      console.log("[BalanceExtractor] ⚠ No balance found in image");
      return {
        balance: null,
        success: true,
        error: "No balance found in image",
      };
    } else {
      console.error(
        "[BalanceExtractor] Invalid response format, balance type:",
        typeof parsed.balance
      );
      return {
        balance: null,
        success: false,
        error: "Invalid response format",
      };
    }
  } catch (parseError) {
    console.error("[BalanceExtractor] Parse error:", parseError);
    console.error("[BalanceExtractor] Raw text response:", textResponse);
    return {
      balance: null,
      success: false,
      error: `Failed to parse balance from response: ${
        parseError instanceof Error ? parseError.message : "Unknown parse error"
      }`,
    };
  }
}

/**
 * Extract balance using Google Gemini API
 */
async function extractWithGemini(
  base64Image: string,
  mimeType: string,
  type: ExtractionType = "balance"
): Promise<BalanceExtractionResult> {
  console.log(
    `[BalanceExtractor] Attempting ${type} extraction with Gemini...`
  );

  if (!GEMINI_API_KEY) {
    return {
      balance: null,
      success: false,
      error: "Gemini API key not configured",
    };
  }

  const ai = getGeminiClient();
  const systemPrompt =
    type === "commission" ? COMMISSION_SYSTEM_PROMPT : BALANCE_SYSTEM_PROMPT;
  const prompt = `${systemPrompt}\n\nPlease analyze this image and extract the ${type}.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
    config: {
      temperature: 0,
      topK: 1,
      topP: 1,
      maxOutputTokens: 100,
    },
  });

  console.log("[BalanceExtractor] Gemini response received");
  const textResponse = response.text || "";
  console.log("[BalanceExtractor] Gemini text response:", textResponse);

  return parseBalanceResponse(textResponse);
}

/**
 * Extract balance using OpenAI GPT-4 Vision API (fallback)
 */
async function extractWithGPT(
  base64Image: string,
  mimeType: string,
  type: ExtractionType = "balance"
): Promise<BalanceExtractionResult> {
  console.log(
    `[BalanceExtractor] Attempting ${type} extraction with GPT-4 Vision...`
  );

  if (!OPENAI_API_KEY) {
    return {
      balance: null,
      success: false,
      error: "OpenAI API key not configured",
    };
  }

  const systemPrompt =
    type === "commission" ? COMMISSION_SYSTEM_PROMPT : BALANCE_SYSTEM_PROMPT;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please analyze this image and extract the ${type}.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 100,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("[BalanceExtractor] GPT API error:", errorData);
    return {
      balance: null,
      success: false,
      error: `GPT API request failed: ${response.status}`,
    };
  }

  const data = await response.json();
  console.log("[BalanceExtractor] GPT response received");

  const textResponse = data.choices?.[0]?.message?.content || "";
  console.log("[BalanceExtractor] GPT text response:", textResponse);

  return parseBalanceResponse(textResponse);
}

/**
 * Extract balance from an image using Google Gemini API with GPT-4 Vision fallback
 */
export async function extractBalanceFromImage(
  imageUri: string,
  type: ExtractionType = "balance"
): Promise<BalanceExtractionResult> {
  console.log(
    `[BalanceExtractor] Starting ${type} extraction for image:`,
    imageUri
  );

  try {
    // Convert image to base64
    const base64Image = await imageToBase64(imageUri);
    const mimeType = getMimeType(imageUri);
    console.log("[BalanceExtractor] MIME type:", mimeType);

    // Try Gemini first
    if (GEMINI_API_KEY) {
      try {
        const geminiResult = await extractWithGemini(
          base64Image,
          mimeType,
          type
        );
        if (geminiResult.success && geminiResult.balance !== null) {
          console.log(
            `[BalanceExtractor] ✓ Gemini ${type} extraction successful`
          );
          return geminiResult;
        }
        console.log(
          `[BalanceExtractor] Gemini ${type} extraction failed or returned null, trying fallback...`
        );
      } catch (geminiError) {
        console.error("[BalanceExtractor] Gemini error:", geminiError);
        console.log("[BalanceExtractor] Falling back to GPT-4 Vision...");
      }
    } else {
      console.log(
        "[BalanceExtractor] No Gemini API key, trying GPT-4 Vision..."
      );
    }

    // Fallback to GPT-4 Vision
    if (OPENAI_API_KEY) {
      try {
        const gptResult = await extractWithGPT(base64Image, mimeType, type);
        if (gptResult.success) {
          console.log(
            `[BalanceExtractor] ✓ GPT-4 Vision ${type} extraction successful`
          );
          return gptResult;
        }
        console.log(
          `[BalanceExtractor] GPT-4 Vision ${type} extraction failed`
        );
      } catch (gptError) {
        console.error("[BalanceExtractor] GPT-4 Vision error:", gptError);
      }
    } else {
      console.log(
        "[BalanceExtractor] No OpenAI API key configured for fallback"
      );
    }

    // Both failed
    return {
      balance: null,
      success: false,
      error: "All extraction methods failed. Please check your API keys.",
    };
  } catch (error) {
    console.error("[BalanceExtractor] ✗ Extraction failed:", error);
    if (error instanceof Error) {
      console.error("[BalanceExtractor] Error stack:", error.stack);
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
  inputBalance: number
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
