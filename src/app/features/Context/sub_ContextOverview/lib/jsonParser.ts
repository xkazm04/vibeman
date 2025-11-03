/**
 * Parses JSON responses from various formats (raw JSON, markdown code blocks, or plain text)
 */
export function parseJsonResponse(text: string): unknown {
  // First, try direct JSON parse
  try {
    return JSON.parse(text);
  } catch {
    // ignore
  }

  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // ignore
    }
  }

  // Try to find the first complete JSON object
  let braceCount = 0;
  let startIndex = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (braceCount === 0) startIndex = i;
      braceCount++;
    } else if (text[i] === '}') {
      braceCount--;
      if (braceCount === 0 && startIndex !== -1) {
        try {
          const jsonStr = text.substring(startIndex, i + 1);
          return JSON.parse(jsonStr);
        } catch {
          // Try next potential JSON object
          startIndex = -1;
        }
      }
    }
  }

  // If all else fails, return the raw text as a fallback object
  return {
    _raw: true,
    _markdown: text,
    summary: 'Response received in markdown format',
    content: text
  };
}
