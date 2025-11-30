/**
 * Line Count Analyzer
 * 
 * Counts lines of code excluding comments and blank lines,
 * and flags files exceeding 200 lines threshold.
 * 
 * Requirements: 4.1
 */

/**
 * Line count threshold for flagging files that need component extraction
 */
export const LINE_COUNT_THRESHOLD = 200;

/**
 * Result of analyzing a file's line count
 */
export interface LineCountResult {
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  exceedsThreshold: boolean;
}

/**
 * State machine for tracking multi-line comment blocks
 */
type CommentState = 'none' | 'block';

/**
 * Checks if a line is a blank line (empty or only whitespace)
 */
export function isBlankLine(line: string): boolean {
  return line.trim().length === 0;
}

/**
 * Checks if a line is a single-line comment
 */
export function isSingleLineComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('//');
}

/**
 * Checks if a line starts a block comment
 */
export function startsBlockComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('/*') && !trimmed.includes('*/');
}

/**
 * Checks if a line ends a block comment
 */
export function endsBlockComment(line: string): boolean {
  return line.includes('*/');
}


/**
 * Checks if a line is entirely within a block comment (starts with *)
 */
export function isBlockCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('*') && !trimmed.startsWith('*/');
}

/**
 * Checks if a line is a full-line block comment (starts with /* and ends with *\/)
 */
export function isFullLineBlockComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('/*') && trimmed.endsWith('*/');
}

/**
 * Analyzes content and counts lines by type
 * 
 * @param content - The file content to analyze
 * @returns LineCountResult with breakdown of line types
 */
export function analyzeLineCount(content: string): LineCountResult {
  const lines = content.split('\n');
  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;
  let commentState: CommentState = 'none';

  for (const line of lines) {
    // Handle blank lines
    if (isBlankLine(line)) {
      blankLines++;
      continue;
    }

    // Handle block comment state
    if (commentState === 'block') {
      commentLines++;
      if (endsBlockComment(line)) {
        commentState = 'none';
      }
      continue;
    }

    // Check for full-line block comment (/* ... */ on same line)
    if (isFullLineBlockComment(line)) {
      commentLines++;
      continue;
    }

    // Check for start of block comment
    if (startsBlockComment(line)) {
      commentLines++;
      commentState = 'block';
      continue;
    }

    // Check for single-line comment
    if (isSingleLineComment(line)) {
      commentLines++;
      continue;
    }

    // Everything else is code
    codeLines++;
  }

  return {
    totalLines: lines.length,
    codeLines,
    commentLines,
    blankLines,
    exceedsThreshold: codeLines > LINE_COUNT_THRESHOLD,
  };
}

/**
 * Checks if a file exceeds the line count threshold
 * 
 * @param content - The file content to check
 * @returns true if code lines exceed threshold
 */
export function exceedsLineThreshold(content: string): boolean {
  const result = analyzeLineCount(content);
  return result.exceedsThreshold;
}

/**
 * Gets the code line count for content
 * 
 * @param content - The file content to analyze
 * @returns Number of code lines (excluding comments and blanks)
 */
export function getCodeLineCount(content: string): number {
  const result = analyzeLineCount(content);
  return result.codeLines;
}
