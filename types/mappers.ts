/**
 * API type mappers - Convert between snake_case API responses and camelCase frontend types
 * These utilities ensure type safety when communicating with the FastAPI backend
 */

/**
 * Converts snake_case object keys to camelCase
 */
export function toCamelCase<T extends Record<string, unknown>>(
  obj: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[camelKey] = toCamelCase(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map((item) =>
        item !== null && typeof item === "object"
          ? toCamelCase(item as Record<string, unknown>)
          : item,
      );
    } else {
      result[camelKey] = value;
    }
  }

  return result as T;
}

/**
 * Converts camelCase object keys to snake_case for API requests
 */
export function toSnakeCase<T extends Record<string, unknown>>(
  obj: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`,
    );

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[snakeKey] = toSnakeCase(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map((item) =>
        item !== null && typeof item === "object"
          ? toSnakeCase(item as Record<string, unknown>)
          : item,
      );
    } else {
      result[snakeKey] = value;
    }
  }

  return result as T;
}

/**
 * Type-safe API response mapper
 * Converts snake_case API response to camelCase typed object
 */
export function mapApiResponse<T>(response: unknown): T {
  if (response === null || response === undefined) {
    return response as T;
  }

  if (Array.isArray(response)) {
    return response.map((item) =>
      typeof item === "object" && item !== null
        ? toCamelCase(item as Record<string, unknown>)
        : item,
    ) as T;
  }

  if (typeof response === "object") {
    return toCamelCase(response as Record<string, unknown>) as T;
  }

  return response as T;
}

/**
 * Type-safe API request mapper
 * Converts camelCase frontend object to snake_case for API
 */
export function mapApiRequest<T>(request: unknown): T {
  if (request === null || request === undefined) {
    return request as T;
  }

  if (Array.isArray(request)) {
    return request.map((item) =>
      typeof item === "object" && item !== null
        ? toSnakeCase(item as Record<string, unknown>)
        : item,
    ) as T;
  }

  if (typeof request === "object") {
    return toSnakeCase(request as Record<string, unknown>) as T;
  }

  return request as T;
}

/**
 * Query string builder that converts camelCase params to snake_case
 */
export function buildTypedQueryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      const snakeKey = key.replace(
        /[A-Z]/g,
        (letter) => `_${letter.toLowerCase()}`,
      );
      searchParams.append(snakeKey, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}
