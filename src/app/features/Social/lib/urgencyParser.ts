/**
 * Urgency Parser
 * Extracts urgency signals from feedback text using keyword patterns,
 * time references, and linguistic cues.
 */

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface UrgencySignal {
  type: 'time_sensitive' | 'deadline' | 'blocking' | 'escalation' | 'impact' | 'keyword';
  phrase: string;
  weight: number;
}

export interface UrgencyAnalysisResult {
  level: UrgencyLevel;
  score: number; // 0 to 1
  signals: UrgencySignal[];
  isTimeSensitive: boolean;
  isBlocking: boolean;
  suggestedResponseTime: string; // e.g., "within 1 hour"
}

// Urgency keyword patterns with weights
const URGENCY_PATTERNS: Array<{ pattern: RegExp; type: UrgencySignal['type']; weight: number }> = [
  // Critical urgency - immediate action needed
  { pattern: /urgent(ly)?/i, type: 'keyword', weight: 0.9 },
  { pattern: /emergency/i, type: 'keyword', weight: 1.0 },
  { pattern: /critical/i, type: 'keyword', weight: 0.95 },
  { pattern: /asap/i, type: 'keyword', weight: 0.85 },
  { pattern: /immediately/i, type: 'keyword', weight: 0.9 },
  { pattern: /right now/i, type: 'time_sensitive', weight: 0.85 },
  { pattern: /as soon as possible/i, type: 'time_sensitive', weight: 0.85 },
  { pattern: /can'?t wait/i, type: 'time_sensitive', weight: 0.8 },
  { pattern: /time sensitive/i, type: 'time_sensitive', weight: 0.9 },

  // Deadlines
  { pattern: /deadline/i, type: 'deadline', weight: 0.85 },
  { pattern: /due (today|tomorrow|by|in \d)/i, type: 'deadline', weight: 0.8 },
  { pattern: /need(s|ed)? by/i, type: 'deadline', weight: 0.75 },
  { pattern: /have to (finish|complete|submit) (by|before)/i, type: 'deadline', weight: 0.8 },
  { pattern: /(today|tonight|this morning|this afternoon)/i, type: 'deadline', weight: 0.7 },
  { pattern: /tomorrow/i, type: 'deadline', weight: 0.6 },
  { pattern: /end of (day|week)/i, type: 'deadline', weight: 0.65 },
  { pattern: /in (\d+|a few|the next) (hour|minute)/i, type: 'deadline', weight: 0.85 },

  // Blocking issues
  { pattern: /(can'?t|cannot|unable to) (work|use|access|continue)/i, type: 'blocking', weight: 0.9 },
  { pattern: /blocking/i, type: 'blocking', weight: 0.85 },
  { pattern: /blocked/i, type: 'blocking', weight: 0.8 },
  { pattern: /stuck/i, type: 'blocking', weight: 0.7 },
  { pattern: /stopped working/i, type: 'blocking', weight: 0.8 },
  { pattern: /completely (broken|down|failed)/i, type: 'blocking', weight: 0.85 },
  { pattern: /nothing (works|is working)/i, type: 'blocking', weight: 0.8 },
  { pattern: /production (issue|down|broken)/i, type: 'blocking', weight: 1.0 },
  { pattern: /outage/i, type: 'blocking', weight: 1.0 },
  { pattern: /system (down|failure)/i, type: 'blocking', weight: 0.95 },

  // Escalation signals
  { pattern: /escalat(e|ed|ing)/i, type: 'escalation', weight: 0.85 },
  { pattern: /speak to (a |your )?(manager|supervisor)/i, type: 'escalation', weight: 0.8 },
  { pattern: /legal/i, type: 'escalation', weight: 0.9 },
  { pattern: /lawyer/i, type: 'escalation', weight: 0.95 },
  { pattern: /sue|lawsuit/i, type: 'escalation', weight: 0.95 },
  { pattern: /report (to|this)/i, type: 'escalation', weight: 0.6 },
  { pattern: /complaint/i, type: 'escalation', weight: 0.5 },
  { pattern: /(cancel|refund) (my|the) (subscription|account)/i, type: 'escalation', weight: 0.7 },

  // Impact signals
  { pattern: /losing (money|customers|data|business)/i, type: 'impact', weight: 0.9 },
  { pattern: /costing (us|me)/i, type: 'impact', weight: 0.8 },
  { pattern: /affecting (all|many|multiple)/i, type: 'impact', weight: 0.75 },
  { pattern: /\d+ (users?|customers?|people) affected/i, type: 'impact', weight: 0.85 },
  { pattern: /entire (team|company|organization)/i, type: 'impact', weight: 0.8 },
  { pattern: /mission critical/i, type: 'impact', weight: 0.95 },
  { pattern: /business critical/i, type: 'impact', weight: 0.9 },
  { pattern: /revenue/i, type: 'impact', weight: 0.7 },
  { pattern: /important (client|customer|meeting|presentation)/i, type: 'impact', weight: 0.75 },

  // Moderate urgency keywords
  { pattern: /please help/i, type: 'keyword', weight: 0.5 },
  { pattern: /need help/i, type: 'keyword', weight: 0.55 },
  { pattern: /really need/i, type: 'keyword', weight: 0.6 },
  { pattern: /desperately/i, type: 'keyword', weight: 0.75 },
  { pattern: /important/i, type: 'keyword', weight: 0.5 },
  { pattern: /priority/i, type: 'keyword', weight: 0.6 },
  { pattern: /high priority/i, type: 'keyword', weight: 0.75 },
];

// Urgency reducers (words that suggest less urgency)
const URGENCY_REDUCERS = [
  /when(ever)? (you|someone) (can|has|gets)/i,
  /no rush/i,
  /not urgent/i,
  /low priority/i,
  /when (possible|convenient)/i,
  /at your (convenience|leisure)/i,
  /take your time/i,
  /just wondering/i,
  /curious (about|if)/i,
  /minor (issue|bug|problem)/i,
];

/**
 * Parse urgency from text
 */
export function parseUrgency(text: string): UrgencyAnalysisResult {
  const normalizedText = text.toLowerCase();
  const signals: UrgencySignal[] = [];

  // Check for urgency reducers first
  let hasReducer = false;
  for (const reducer of URGENCY_REDUCERS) {
    if (reducer.test(normalizedText)) {
      hasReducer = true;
      break;
    }
  }

  // Detect urgency signals
  for (const { pattern, type, weight } of URGENCY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      signals.push({
        type,
        phrase: match[0],
        weight: hasReducer ? weight * 0.5 : weight,
      });
    }
  }

  // Calculate score
  const maxScore = signals.length > 0
    ? Math.max(...signals.map(s => s.weight))
    : 0;

  const avgScore = signals.length > 0
    ? signals.reduce((sum, s) => sum + s.weight, 0) / signals.length
    : 0;

  // Combine max and avg for final score (weighted towards max)
  const score = Math.min(1, maxScore * 0.7 + avgScore * 0.3);

  // Determine urgency level
  const level = scoreToLevel(score);

  // Check for specific signal types
  const isTimeSensitive = signals.some(
    s => s.type === 'time_sensitive' || s.type === 'deadline'
  );
  const isBlocking = signals.some(s => s.type === 'blocking');

  // Suggest response time based on level
  const suggestedResponseTime = getSuggestedResponseTime(level);

  return {
    level,
    score,
    signals: signals.sort((a, b) => b.weight - a.weight).slice(0, 5),
    isTimeSensitive,
    isBlocking,
    suggestedResponseTime,
  };
}

/**
 * Convert score to urgency level
 */
function scoreToLevel(score: number): UrgencyLevel {
  if (score >= 0.85) return 'critical';
  if (score >= 0.65) return 'high';
  if (score >= 0.4) return 'medium';
  if (score >= 0.2) return 'low';
  return 'none';
}

/**
 * Get suggested response time for urgency level
 */
function getSuggestedResponseTime(level: UrgencyLevel): string {
  const times: Record<UrgencyLevel, string> = {
    critical: 'within 1 hour',
    high: 'within 4 hours',
    medium: 'within 24 hours',
    low: 'within 2-3 days',
    none: 'standard response time',
  };
  return times[level];
}

/**
 * Get urgency level color
 */
export function getUrgencyColor(level: UrgencyLevel): { bg: string; text: string; border: string } {
  const colors: Record<UrgencyLevel, { bg: string; text: string; border: string }> = {
    critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
    high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40' },
    medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' },
    low: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
    none: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/40' },
  };
  return colors[level];
}

/**
 * Get urgency icon name (lucide)
 */
export function getUrgencyIconName(level: UrgencyLevel): string {
  const icons: Record<UrgencyLevel, string> = {
    critical: 'alert-triangle',
    high: 'alert-circle',
    medium: 'clock',
    low: 'info',
    none: 'minus',
  };
  return icons[level];
}

/**
 * Batch parse urgency for multiple texts
 */
export function parseUrgencyBatch(texts: string[]): UrgencyAnalysisResult[] {
  return texts.map(text => parseUrgency(text));
}

/**
 * Get urgency distribution from results
 */
export function aggregateUrgency(results: UrgencyAnalysisResult[]): {
  distribution: Record<UrgencyLevel, number>;
  averageScore: number;
  timeSensitiveCount: number;
  blockingCount: number;
} {
  const distribution: Record<UrgencyLevel, number> = {
    critical: 0, high: 0, medium: 0, low: 0, none: 0,
  };

  let totalScore = 0;
  let timeSensitiveCount = 0;
  let blockingCount = 0;

  for (const result of results) {
    distribution[result.level]++;
    totalScore += result.score;
    if (result.isTimeSensitive) timeSensitiveCount++;
    if (result.isBlocking) blockingCount++;
  }

  return {
    distribution,
    averageScore: results.length > 0 ? totalScore / results.length : 0,
    timeSensitiveCount,
    blockingCount,
  };
}

/**
 * Check if urgency level requires immediate attention
 */
export function requiresImmediateAttention(level: UrgencyLevel): boolean {
  return level === 'critical' || level === 'high';
}

/**
 * Get a human-readable urgency label
 */
export function getUrgencyLabel(level: UrgencyLevel): string {
  const labels: Record<UrgencyLevel, string> = {
    critical: 'Critical - Immediate Action',
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
    none: 'Standard',
  };
  return labels[level];
}
