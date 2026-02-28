/**
 * Shared string-manipulation utilities.
 *
 * Each helper replaces a commonly duplicated `.replace()` chain
 * with a single, tested function call.
 */

/**
 * Lower-case, trim, strip non-alphanumeric (except spaces), and collapse whitespace.
 *
 * Before:
 *   text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ')
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Remove leading markdown list markers (`- `, `* `, `+ `, `1. `, etc.).
 *
 * Before:
 *   line.trim().replace(/^[-*+]\s/, '').replace(/^\d+\.\s/, '')
 */
export function stripMarkdownListPrefix(line: string): string {
  return line
    .trim()
    .replace(/^[-*+]\s/, '')
    .replace(/^\d+\.\s/, '');
}

/**
 * Strip wrapping markdown code fences (` ```json `, ` ``` `).
 *
 * Before:
 *   str.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '')
 *   str.replace(/^```\s*\n?/i, '').replace(/\n?```\s*$/i, '')
 */
export function stripCodeFences(str: string): string {
  return str
    .trim()
    .replace(/^```\w*\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '');
}

/**
 * Normalize line endings to `\n`.
 *
 * Before:
 *   content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
 */
export function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Convert an ISO 8601 timestamp to a SQLite-friendly `YYYY-MM-DD HH:MM:SS` string.
 *
 * Before:
 *   new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19)
 */
export function toSqliteDateTime(date: Date = new Date()): string {
  return date.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}
