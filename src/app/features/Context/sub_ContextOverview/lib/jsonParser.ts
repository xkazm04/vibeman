/**
 * Parses JSON responses from various formats (raw JSON, markdown code blocks, or plain text)
 * Includes comprehensive error handling and validation
 */

export interface ParseResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  rawInput?: string;
}

export interface TestStep {
  type: 'navigate' | 'wait' | 'click' | 'type' | 'scroll' | 'screenshot';
  url?: string;
  delay?: number;
  selector?: string;
  text?: string;
  scrollY?: number;
}

/**
 * Validates that an object is a valid test step
 */
export function isValidTestStep(step: unknown): step is TestStep {
  if (!step || typeof step !== 'object') return false;

  const s = step as Record<string, unknown>;
  const validTypes = ['navigate', 'wait', 'click', 'type', 'scroll', 'screenshot'];

  if (typeof s.type !== 'string' || !validTypes.includes(s.type)) return false;

  // Validate type-specific fields
  switch (s.type) {
    case 'navigate':
      return typeof s.url === 'string' && s.url.length > 0;
    case 'wait':
      return s.delay === undefined || (typeof s.delay === 'number' && s.delay >= 0);
    case 'click':
      return typeof s.selector === 'string' && s.selector.length > 0;
    case 'type':
      return typeof s.selector === 'string' && s.selector.length > 0 && typeof s.text === 'string';
    case 'scroll':
      return s.scrollY === undefined || typeof s.scrollY === 'number';
    case 'screenshot':
      return true;
    default:
      return false;
  }
}

/**
 * Validates an array of test steps
 */
export function validateTestSteps(steps: unknown[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(steps)) {
    return { valid: false, errors: ['Input must be an array'] };
  }

  steps.forEach((step, index) => {
    if (!isValidTestStep(step)) {
      const s = step as Record<string, unknown>;
      if (!s || typeof s !== 'object') {
        errors.push(`Step ${index + 1}: Invalid step format (must be an object)`);
      } else if (!s.type) {
        errors.push(`Step ${index + 1}: Missing 'type' field`);
      } else {
        errors.push(`Step ${index + 1}: Invalid configuration for type '${s.type}'`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Parses JSON responses from various formats with detailed error reporting
 */
export function parseJsonResponse(text: string): unknown {
  // Handle empty or whitespace-only input
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return {
      _raw: true,
      _empty: true,
      summary: 'Empty input',
      content: '',
    };
  }

  const trimmedText = text.trim();

  // First, try direct JSON parse
  try {
    return JSON.parse(trimmedText);
  } catch {
    // Continue to other parsing methods
  }

  // Try to extract JSON from markdown code blocks
  const jsonMatch = trimmedText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      // Log the parsing error for debugging but continue
      console.warn('[jsonParser] Failed to parse JSON from code block:', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  // Try to find the first complete JSON object
  let braceCount = 0;
  let startIndex = -1;

  for (let i = 0; i < trimmedText.length; i++) {
    if (trimmedText[i] === '{') {
      if (braceCount === 0) startIndex = i;
      braceCount++;
    } else if (trimmedText[i] === '}') {
      braceCount--;
      if (braceCount === 0 && startIndex !== -1) {
        try {
          const jsonStr = trimmedText.substring(startIndex, i + 1);
          return JSON.parse(jsonStr);
        } catch {
          // Try next potential JSON object
          startIndex = -1;
        }
      }
    }
  }

  // Try to find array format
  let bracketCount = 0;
  startIndex = -1;

  for (let i = 0; i < trimmedText.length; i++) {
    if (trimmedText[i] === '[') {
      if (bracketCount === 0) startIndex = i;
      bracketCount++;
    } else if (trimmedText[i] === ']') {
      bracketCount--;
      if (bracketCount === 0 && startIndex !== -1) {
        try {
          const jsonStr = trimmedText.substring(startIndex, i + 1);
          return JSON.parse(jsonStr);
        } catch {
          // Try next potential JSON array
          startIndex = -1;
        }
      }
    }
  }

  // If all else fails, return the raw text as a fallback object
  return {
    _raw: true,
    _markdown: true,
    summary: 'Response received in markdown format',
    content: trimmedText,
  };
}

/**
 * Safely parses test scenario JSON with validation and user-friendly error messages
 */
export function parseTestScenario(text: string): ParseResult<TestStep[]> {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return {
      success: false,
      error: 'Test scenario is empty',
      rawInput: text,
    };
  }

  try {
    const parsed = JSON.parse(text.trim());

    if (!Array.isArray(parsed)) {
      return {
        success: false,
        error: 'Test scenario must be an array of steps',
        rawInput: text,
      };
    }

    const validation = validateTestSteps(parsed);

    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid test steps:\n${validation.errors.join('\n')}`,
        rawInput: text,
      };
    }

    return {
      success: true,
      data: parsed as TestStep[],
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown parsing error';

    // Provide helpful error messages for common JSON issues
    let friendlyError = 'Invalid JSON format';

    if (errorMessage.includes('Unexpected token')) {
      const match = errorMessage.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1], 10);
        const context = text.substring(Math.max(0, position - 20), position + 20);
        friendlyError = `Syntax error near: "...${context}..."`;
      } else {
        friendlyError = 'Invalid JSON syntax - check for missing quotes, commas, or brackets';
      }
    } else if (errorMessage.includes('Unexpected end')) {
      friendlyError = 'Incomplete JSON - missing closing brackets or braces';
    }

    return {
      success: false,
      error: friendlyError,
      rawInput: text,
    };
  }
}

/**
 * Safely stringify with error handling
 */
export function safeStringify(value: unknown, pretty = false): string {
  try {
    return JSON.stringify(value, null, pretty ? 2 : undefined);
  } catch (e) {
    console.error('[jsonParser] Failed to stringify value:', e);
    return '{}';
  }
}
