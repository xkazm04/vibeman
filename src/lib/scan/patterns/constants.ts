/**
 * Magic number detection
 */

/**
 * Split content into lines
 */
function splitLines(content: string): string[] {
  return content.split('\n');
}

/**
 * Detects magic numbers that should be extracted to named constants
 */
export interface MagicNumber {
  line: number;
  number: string;
  context: string;
  suggestedName?: string;
  severity: 'low' | 'medium' | 'high';
}

export function detectMagicNumbers(content: string): MagicNumber[] {
  const lines = splitLines(content);
  const magicNumbers: MagicNumber[] = [];

  // Common exceptions - numbers that are typically OK to hardcode
  const allowedNumbers = new Set([
    '0', '1', '2', '-1',
    '10', '100', '1000',
    '0.0', '1.0', '0.5',
    '24', '60', // Time-related
    '365', // Days in year
  ]);

  // File types to skip (tests, config files)
  const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(content) ||
                     content.includes('describe(') ||
                     content.includes('it(');

  // Skip test files - they commonly have acceptable magic numbers
  if (isTestFile) {
    return [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments, imports, and empty lines
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') ||
        trimmed.startsWith('*') || trimmed.startsWith('import ')) {
      continue;
    }

    // Skip lines that are already constant declarations
    if (/^(const|let|var)\s+[A-Z_][A-Z0-9_]*\s*=/.test(trimmed)) {
      continue;
    }

    // Skip array/object indices
    if (/\[\d+\]/.test(trimmed)) {
      continue;
    }

    // Detect numeric literals (integer and decimal)
    const numberPattern = /\b(\d+\.?\d*|\d*\.\d+)\b/g;
    let match;

    while ((match = numberPattern.exec(trimmed)) !== null) {
      const number = match[1];

      // Skip allowed numbers
      if (allowedNumbers.has(number)) {
        continue;
      }

      // Skip very small numbers (likely array indices or simple counters)
      const numValue = parseFloat(number);
      if (numValue >= 0 && numValue <= 2) {
        continue;
      }

      // Skip numbers in property access (e.g., http2, md5)
      const beforeNumber = trimmed.substring(0, match.index);
      if (/[a-zA-Z_]$/.test(beforeNumber)) {
        continue;
      }

      // Get context around the number
      const contextStart = Math.max(0, match.index - 20);
      const contextEnd = Math.min(trimmed.length, match.index + number.length + 20);
      const context = trimmed.substring(contextStart, contextEnd).trim();

      // Determine severity based on number characteristics
      let severity: 'low' | 'medium' | 'high' = 'low';
      let suggestedName: string | undefined;

      // High severity for likely configuration values
      if (numValue > 1000) {
        severity = 'high';
        if (context.includes('timeout') || context.includes('setTimeout')) {
          suggestedName = 'TIMEOUT_MS';
        } else if (context.includes('limit') || context.includes('max')) {
          suggestedName = 'MAX_LIMIT';
        } else if (context.includes('size') || context.includes('buffer')) {
          suggestedName = 'BUFFER_SIZE';
        }
      } else if (numValue >= 100) {
        severity = 'medium';
      }

      // Detect common patterns and suggest names
      if (!suggestedName) {
        if (context.includes('status') && numValue >= 100 && numValue < 600) {
          suggestedName = `HTTP_STATUS_${numValue}`;
          severity = 'medium';
        } else if (context.includes('port')) {
          suggestedName = 'PORT';
          severity = 'high';
        } else if (context.includes('delay') || context.includes('wait')) {
          suggestedName = 'DELAY_MS';
          severity = 'medium';
        } else if (context.includes('retries') || context.includes('attempts')) {
          suggestedName = 'MAX_RETRIES';
          severity = 'medium';
        } else if (context.includes('page') || context.includes('per')) {
          suggestedName = 'PAGE_SIZE';
          severity = 'medium';
        }
      }

      magicNumbers.push({
        line: i + 1,
        number,
        context,
        suggestedName,
        severity,
      });
    }
  }

  return magicNumbers;
}
