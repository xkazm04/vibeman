/**
 * Safe JSON parser for LLM responses.
 *
 * LLMs frequently wrap JSON in markdown code fences or add preamble text.
 * This utility strips those artifacts and locates the first valid JSON
 * object or array before parsing.
 */

export function safeParseLLMJson<T = unknown>(raw: string): T {
  // 1. Try direct parse first (fast path)
  try {
    return JSON.parse(raw);
  } catch {
    // fall through to extraction
  }

  // 2. Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // fall through
    }
  }

  // 3. Find first { or [ and try parsing from there to last matching } or ]
  const firstBrace = raw.indexOf('{');
  const firstBracket = raw.indexOf('[');
  const candidates: Array<[number, string]> = [];
  if (firstBrace !== -1) candidates.push([firstBrace, '}']);
  if (firstBracket !== -1) candidates.push([firstBracket, ']']);
  candidates.sort((a, b) => a[0] - b[0]);

  for (const [start, close] of candidates) {
    const lastClose = raw.lastIndexOf(close);
    if (lastClose > start) {
      try {
        return JSON.parse(raw.slice(start, lastClose + 1));
      } catch {
        // fall through
      }
    }
  }

  // 4. Nothing worked — throw
  throw new SyntaxError(`Failed to extract JSON from LLM response: ${raw.slice(0, 100)}...`);
}
