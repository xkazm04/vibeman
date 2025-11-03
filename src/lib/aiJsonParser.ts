/**
 * Helper function to parse AI JSON responses that may include ```json wrapper
 * Handles various edge cases like smart quotes, special dashes, and Unicode characters
 */
export function parseAIJsonResponse(response: string): Record<string, unknown> | unknown[] {
  // Normalize special characters that might cause JSON parsing issues
  const normalizeJson = (jsonStr: string): string => {
    return jsonStr
      // Replace various dash types with regular hyphen
      .replace(/[‑–—−]/g, '-')
      // Replace smart quotes with regular quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Replace other problematic Unicode characters
      .replace(/[…]/g, '...')
      // Remove any BOM or invisible characters
      .replace(/^\uFEFF/, '')
      // Remove any other invisible/control characters including narrow no-break space
      .replace(/[\u200B-\u200D\uFEFF\u202F]/g, '')
      .trim();
  };

  const tryParse = (jsonStr: string): Record<string, unknown> | unknown[] => {
    const normalized = normalizeJson(jsonStr);
    return JSON.parse(normalized);
  };

  // Check if response has ```json wrapper first
  if (response.includes('```json')) {
    const startIndex = response.indexOf('```json') + 7;
    const endIndex = response.indexOf('```', startIndex);

    if (endIndex !== -1) {
      const jsonContent = response.substring(startIndex, endIndex).trim();
      return tryParse(jsonContent);
    }
  }

  // If no wrapper, try to parse as-is
  try {
    return tryParse(response);
  } catch (error) {
    const extracted = extractJsonArray(response);
    if (extracted) {
      return tryParse(extracted);
    }

    const extractedObj = extractJsonObject(response);
    if (extractedObj) {
      return tryParse(extractedObj);
    }

    throw new Error(`Failed to parse AI JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generic function to extract JSON structure using delimiter counting
 */
function extractJsonStructure(
  text: string,
  openDelimiter: string,
  closeDelimiter: string
): string | null {
  const startIndex = text.indexOf(openDelimiter);
  if (startIndex === -1) return null;

  let delimiterCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    // Handle escape sequences in strings
    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    // Track string boundaries (to ignore delimiters inside strings)
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    // Only count delimiters outside of strings
    if (!inString) {
      if (char === openDelimiter) {
        delimiterCount++;
      } else if (char === closeDelimiter) {
        delimiterCount--;

        // Found matching closing delimiter
        if (delimiterCount === 0) {
          return text.substring(startIndex, i + 1);
        }
      }
    }
  }

  return null;
}

/**
 * Extract JSON array from text using bracket counting to handle nested structures
 */
function extractJsonArray(text: string): string | null {
  return extractJsonStructure(text, '[', ']');
}

/**
 * Extract JSON object from text using brace counting to handle nested structures
 */
function extractJsonObject(text: string): string | null {
  return extractJsonStructure(text, '{', '}');
}
