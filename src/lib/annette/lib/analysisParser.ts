/**
 * Analysis Parser
 * Parses CLI stream-json log output into structured analysis results
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// --- Types ---

export interface AnalysisFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  files: string[];
}

export interface AnalysisRecommendation {
  title: string;
  description: string;
  effort: 'small' | 'medium' | 'large';
  impact: 'high' | 'medium' | 'low';
  files: string[];
}

export interface AnalysisResult {
  contextId: string;
  contextName: string;
  analysisType: string;
  findings: AnalysisFinding[];
  recommendations: AnalysisRecommendation[];
  summary: string;
  rawOutput: string;
  timestamp: string;
}

export interface AnalysisMeta {
  contextId: string;
  contextName: string;
  analysisType: string;
  requirementName: string;
  startedAt: number;
}

// --- Log File Discovery ---

/**
 * Find the log file for a given analysis requirement name.
 * Log files are stored at: .claude/logs/terminal_{requirementName}_*.log
 */
export function findAnalysisLogFile(projectPath: string, requirementName: string): string | null {
  const logsDir = join(projectPath, '.claude', 'logs');
  if (!existsSync(logsDir)) return null;

  try {
    const files = readdirSync(logsDir);
    // Match files starting with terminal_{requirementName}_
    const prefix = `terminal_${requirementName}_`;
    const matching = files
      .filter(f => f.startsWith(prefix) && f.endsWith('.log'))
      .sort()
      .reverse(); // most recent first

    return matching.length > 0 ? join(logsDir, matching[0]) : null;
  } catch {
    return null;
  }
}

// --- Stream-JSON Extraction ---

/**
 * Extract assistant text content from a CLI execution log file.
 * Log lines contain stream-json objects with [STDOUT] prefix.
 */
export function extractTextFromLog(logPath: string): string {
  const content = readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');
  const textParts: string[] = [];

  for (const line of lines) {
    // Match lines like: [timestamp] [STDOUT] {"type":"assistant",...}
    const stdoutMatch = line.match(/\[STDOUT\]\s*(.+)$/);
    if (!stdoutMatch) continue;

    try {
      const parsed = JSON.parse(stdoutMatch[1]);

      // Extract text from assistant messages
      if (parsed.type === 'assistant' && parsed.message?.content) {
        for (const block of parsed.message.content) {
          if (block.type === 'text' && block.text) {
            textParts.push(block.text);
          }
        }
      }

      // Also capture from result type (final summary)
      if (parsed.type === 'result' && parsed.result) {
        textParts.push(String(parsed.result));
      }
    } catch {
      // Not valid JSON, skip
    }
  }

  return textParts.join('\n');
}

// --- Markdown Parsing ---

/**
 * Parse the full analysis output text into a structured AnalysisResult
 */
export function parseAnalysisOutput(
  rawText: string,
  meta: { contextId: string; contextName: string; analysisType: string }
): AnalysisResult {
  const findings = extractFindings(rawText);
  const recommendations = extractRecommendations(rawText);
  const summary = extractSummary(rawText);

  return {
    contextId: meta.contextId,
    contextName: meta.contextName,
    analysisType: meta.analysisType,
    findings,
    recommendations,
    summary,
    rawOutput: rawText,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Extract findings from ## FINDINGS section
 * Looks for ### [Severity] title patterns
 */
export function extractFindings(text: string): AnalysisFinding[] {
  const findingsSection = extractSection(text, 'FINDINGS');
  if (!findingsSection) return [];

  const findings: AnalysisFinding[] = [];
  // Match ### [Critical] title or ### [High] title etc.
  const blockPattern = /###\s*\[(Critical|High|Medium|Low)\]\s*[—\-–]\s*(.+?)(?=\n###|\n##\s|$)/gis;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(findingsSection)) !== null) {
    const severity = match[1].toLowerCase() as AnalysisFinding['severity'];
    const title = match[2].trim();
    const fullBlock = match[0];
    const description = fullBlock
      .replace(/^###.*\n?/, '')
      .trim();
    const files = extractFilePaths(fullBlock);

    findings.push({ severity, title, description, files });
  }

  return findings;
}

/**
 * Extract recommendations from ## RECOMMENDATIONS section
 * Looks for ### N. title patterns with **Effort:** and **Impact:** markers
 */
export function extractRecommendations(text: string): AnalysisRecommendation[] {
  const recSection = extractSection(text, 'RECOMMENDATIONS');
  if (!recSection) return [];

  const recs: AnalysisRecommendation[] = [];
  // Match ### 1. title or ### 2. title etc.
  const blockPattern = /###\s*\d+\.\s*(.+?)(?=\n###|\n##\s|$)/gis;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(recSection)) !== null) {
    const title = match[1].trim();
    const fullBlock = match[0];

    const effortMatch = fullBlock.match(/\*\*Effort:\*\*\s*(small|medium|large)/i);
    const impactMatch = fullBlock.match(/\*\*Impact:\*\*\s*(high|medium|low)/i);
    const effort = (effortMatch?.[1]?.toLowerCase() || 'medium') as AnalysisRecommendation['effort'];
    const impact = (impactMatch?.[1]?.toLowerCase() || 'medium') as AnalysisRecommendation['impact'];
    const files = extractFilePaths(fullBlock);

    const description = fullBlock
      .replace(/^###.*\n?/, '')
      .replace(/\*\*Effort:\*\*.*/i, '')
      .replace(/\*\*Impact:\*\*.*/i, '')
      .replace(/\*\*Files:\*\*.*/i, '')
      .trim();

    recs.push({ title, description, effort, impact, files });
  }

  return recs;
}

/**
 * Extract ## SUMMARY section content
 */
function extractSummary(text: string): string {
  const section = extractSection(text, 'SUMMARY');
  return section?.trim() || '';
}

/**
 * Extract a named markdown section (## SECTION_NAME ... until next ##)
 */
function extractSection(text: string, sectionName: string): string | null {
  const pattern = new RegExp(
    `##\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##\\s[A-Z]|$)`,
    'i'
  );
  const match = text.match(pattern);
  return match ? match[1] : null;
}

/**
 * Extract file paths from backtick-quoted strings that look like file paths
 */
export function extractFilePaths(text: string): string[] {
  const paths = new Set<string>();

  // Match backtick-quoted paths
  const backtickPattern = /`([^`]+\.[a-z]{1,4})`/g;
  let match: RegExpExecArray | null;

  while ((match = backtickPattern.exec(text)) !== null) {
    const candidate = match[1];
    // Filter to likely file paths (contains / or \, has extension)
    if (candidate.includes('/') || candidate.includes('\\')) {
      paths.add(candidate);
    }
  }

  // Also match **Files:** lines
  const filesLinePattern = /\*\*Files:\*\*\s*(.+)/g;
  while ((match = filesLinePattern.exec(text)) !== null) {
    const fileLine = match[1];
    const fileRefs = fileLine.match(/`([^`]+)`/g);
    if (fileRefs) {
      for (const ref of fileRefs) {
        paths.add(ref.replace(/`/g, ''));
      }
    }
  }

  return Array.from(paths);
}
