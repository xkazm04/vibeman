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

    // Try to find JSON array in the response
    const arrayMatch = response.match(/\[[\s\S]*?\]/);
    if (arrayMatch) {
      console.log('Found JSON array in response, extracting...');
      return tryParse(arrayMatch[0]);
    }

    // Log the full response for debugging
    console.error('Failed to parse AI response:', response);
    throw new Error(`Failed to parse AI JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
