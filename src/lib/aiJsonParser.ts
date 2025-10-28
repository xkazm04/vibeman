/**
 * Helper function to parse AI JSON responses that may include ```json wrapper
 * Handles various edge cases like smart quotes, special dashes, and Unicode characters
 */
export function parseAIJsonResponse(response: string): any {
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

  const tryParse = (jsonStr: string): any => {
    try {
      const normalized = normalizeJson(jsonStr);
      console.log('Attempting to parse normalized JSON:', normalized.substring(0, 200) + '...');
      return JSON.parse(normalized);
    } catch (error) {
      console.error('JSON parsing failed for:', jsonStr.substring(0, 200) + '...');
      console.error('Parse error:', error);
      throw error;
    }
  };

  console.log('parseAIJsonResponse called with response length:', response.length);
  console.log('Response starts with:', response.substring(0, 50));

  // Check if response has ```json wrapper first
  if (response.includes('```json')) {
    console.log('Found ```json marker, extracting...');

    // Find the start of JSON content after ```json
    const startIndex = response.indexOf('```json') + 7; // 7 = length of '```json'
    const endIndex = response.indexOf('```', startIndex);

    if (endIndex !== -1) {
      const jsonContent = response.substring(startIndex, endIndex).trim();
      console.log('Extracted JSON content:', jsonContent.substring(0, 100) + '...');
      console.log('JSON content length:', jsonContent.length);
      return tryParse(jsonContent);
    }
  }

  // If no wrapper, try to parse as-is
  try {
    return tryParse(response);
  } catch (error) {
    console.log('Direct parsing failed, trying to find JSON array...');

    // Try to extract JSON array using bracket counting (handles nested arrays/objects)
    const extracted = extractJsonArray(response);
    if (extracted) {
      console.log('Found JSON array in response using bracket counting, extracting...');
      return tryParse(extracted);
    }

    // Fallback: try object extraction
    const extractedObj = extractJsonObject(response);
    if (extractedObj) {
      console.log('Found JSON object in response using bracket counting, extracting...');
      return tryParse(extractedObj);
    }

    // Log the full response for debugging
    console.error('Failed to parse AI response:', response);
    throw new Error(`Failed to parse AI JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract JSON array from text using bracket counting to handle nested structures
 */
function extractJsonArray(text: string): string | null {
  const startIndex = text.indexOf('[');
  if (startIndex === -1) return null;

  let bracketCount = 0;
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

    // Track string boundaries (to ignore brackets inside strings)
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    // Only count brackets outside of strings
    if (!inString) {
      if (char === '[') {
        bracketCount++;
      } else if (char === ']') {
        bracketCount--;

        // Found matching closing bracket
        if (bracketCount === 0) {
          return text.substring(startIndex, i + 1);
        }
      }
    }
  }

  return null;
}

/**
 * Extract JSON object from text using brace counting to handle nested structures
 */
function extractJsonObject(text: string): string | null {
  const startIndex = text.indexOf('{');
  if (startIndex === -1) return null;

  let braceCount = 0;
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

    // Track string boundaries (to ignore braces inside strings)
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    // Only count braces outside of strings
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;

        // Found matching closing brace
        if (braceCount === 0) {
          return text.substring(startIndex, i + 1);
        }
      }
    }
  }

  return null;
}
