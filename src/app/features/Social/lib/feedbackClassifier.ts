/**
 * Feedback Classifier
 * Automatically categorizes feedback items using pattern matching
 * and keyword analysis. Can be enhanced with LLM for nuanced cases.
 */

import type { FeedbackItem, KanbanPriority } from './types/feedbackTypes';
import type { FeedbackClassification, DevTeam } from './types/aiTypes';

export interface ClassificationResult {
  classification: FeedbackClassification | 'question' | 'praise' | 'complaint';
  confidence: number; // 0 to 1
  signals: string[];
  suggestedPriority: KanbanPriority;
  suggestedTeam?: DevTeam;
  tags: string[];
  needsReview: boolean; // True if confidence below threshold
}

export interface ClassificationConfig {
  confidenceThreshold: number; // Below this, mark for review
  enableLLMFallback: boolean;
  priorityBoosts: {
    vipCustomer: number;
    highFollowers: number;
    publicChannel: number;
    repeatContact: number;
  };
}

// Default configuration
const DEFAULT_CONFIG: ClassificationConfig = {
  confidenceThreshold: 0.7,
  enableLLMFallback: true,
  priorityBoosts: {
    vipCustomer: 0.2,
    highFollowers: 0.1,
    publicChannel: 0.15,
    repeatContact: 0.15,
  },
};

// Classification patterns
const CLASSIFICATION_PATTERNS: Record<string, { patterns: RegExp[]; keywords: string[]; weight: number }> = {
  bug: {
    patterns: [
      /doesn'?t work/i,
      /not working/i,
      /broken/i,
      /crash(es|ed|ing)?/i,
      /error/i,
      /bug/i,
      /glitch/i,
      /freeze(s|d)?/i,
      /hang(s|ing)?/i,
      /fail(s|ed|ing)?/i,
      /wrong/i,
      /incorrect/i,
      /stuck/i,
      /can'?t (access|use|see|find|click|open|load)/i,
      /won'?t (work|load|open|start)/i,
      /keeps (crashing|freezing|failing)/i,
    ],
    keywords: [
      'bug', 'issue', 'problem', 'error', 'crash', 'broken', 'fix',
      'defect', 'malfunction', 'glitch', 'freeze', '500', '404',
      'exception', 'stack trace', 'unhandled',
    ],
    weight: 0.8,
  },
  feature: {
    patterns: [
      /would be (great|nice|helpful|awesome)/i,
      /can you add/i,
      /please add/i,
      /feature request/i,
      /i wish/i,
      /it would help if/i,
      /suggestion/i,
      /how about adding/i,
      /could you (implement|add|include)/i,
      /request(ing)? (a |the )?feature/i,
    ],
    keywords: [
      'feature', 'request', 'suggestion', 'add', 'implement', 'new',
      'enhancement', 'improve', 'upgrade', 'wish', 'idea', 'propose',
    ],
    weight: 0.75,
  },
  question: {
    patterns: [
      /how (do|can|to|does)/i,
      /what (is|are|does)/i,
      /where (is|are|can|do)/i,
      /when (will|can|do)/i,
      /why (is|does|doesn'?t)/i,
      /is (it|there|this) (possible|a way)/i,
      /can (i|you|we)/i,
      /does (it|this|the)/i,
      /\?$/,
    ],
    keywords: [
      'how', 'what', 'where', 'when', 'why', 'help', 'explain',
      'documentation', 'tutorial', 'guide', 'instruction',
    ],
    weight: 0.7,
  },
  praise: {
    patterns: [
      /love (this|it|the|your)/i,
      /great (job|work|app|product)/i,
      /amazing/i,
      /awesome/i,
      /thank(s| you)/i,
      /excellent/i,
      /fantastic/i,
      /wonderful/i,
      /best (app|product|service)/i,
      /keep up the (good|great) work/i,
    ],
    keywords: [
      'love', 'great', 'amazing', 'awesome', 'excellent', 'fantastic',
      'wonderful', 'perfect', 'incredible', 'outstanding', 'brilliant',
      'thanks', 'thank', 'appreciate', 'grateful',
    ],
    weight: 0.65,
  },
  complaint: {
    patterns: [
      /terrible/i,
      /worst/i,
      /hate (this|it)/i,
      /disappointed/i,
      /frustrated/i,
      /awful/i,
      /horrible/i,
      /unacceptable/i,
      /waste of (time|money)/i,
      /never (using|buying|recommending)/i,
    ],
    keywords: [
      'terrible', 'worst', 'hate', 'disappointed', 'frustrated',
      'awful', 'horrible', 'useless', 'waste', 'scam', 'ripoff',
    ],
    weight: 0.7,
  },
};

// Team routing patterns
const TEAM_PATTERNS: Record<DevTeam, { patterns: RegExp[]; keywords: string[] }> = {
  frontend: {
    patterns: [/ui|interface|button|page|layout|css|style|design/i],
    keywords: ['button', 'page', 'layout', 'css', 'style', 'ui', 'ux', 'design', 'visual', 'display'],
  },
  backend: {
    patterns: [/api|server|database|slow|timeout|500|internal/i],
    keywords: ['api', 'server', 'database', 'timeout', 'slow', 'backend', 'endpoint', 'data'],
  },
  mobile: {
    patterns: [/app|ios|android|mobile|phone|tablet/i],
    keywords: ['app', 'ios', 'android', 'mobile', 'iphone', 'phone', 'tablet', 'touch'],
  },
  platform: {
    patterns: [/infrastructure|deploy|scale|aws|cloud/i],
    keywords: ['infrastructure', 'deploy', 'cloud', 'aws', 'scale', 'devops'],
  },
  data: {
    patterns: [/analytics|report|metric|dashboard|data/i],
    keywords: ['analytics', 'report', 'metric', 'dashboard', 'data', 'statistics'],
  },
  payments: {
    patterns: [/payment|billing|charge|subscription|invoice|refund/i],
    keywords: ['payment', 'billing', 'charge', 'subscription', 'invoice', 'refund', 'money', 'credit'],
  },
  search: {
    patterns: [/search|find|filter|sort|results/i],
    keywords: ['search', 'find', 'filter', 'sort', 'results', 'query'],
  },
  notifications: {
    patterns: [/notification|alert|email|push|message/i],
    keywords: ['notification', 'alert', 'email', 'push', 'message', 'notify'],
  },
  security: {
    patterns: [/security|password|login|auth|hack|breach|2fa/i],
    keywords: ['security', 'password', 'login', 'auth', 'hack', 'breach', '2fa', 'account'],
  },
  localization: {
    patterns: [/language|translate|locale|i18n|region/i],
    keywords: ['language', 'translate', 'locale', 'region', 'country', 'currency'],
  },
  'customer-success': {
    patterns: [/support|help|agent|chat|ticket/i],
    keywords: ['support', 'help', 'agent', 'chat', 'ticket', 'customer service'],
  },
  growth: {
    patterns: [/onboarding|trial|pricing|plan|upgrade/i],
    keywords: ['onboarding', 'trial', 'pricing', 'plan', 'upgrade', 'convert'],
  },
};

// Tag extraction patterns
const TAG_PATTERNS: Record<string, RegExp[]> = {
  performance: [/slow|lag|delay|timeout|performance/i],
  accessibility: [/accessibility|a11y|screen reader|keyboard|contrast/i],
  mobile: [/mobile|ios|android|app/i],
  desktop: [/desktop|web|browser/i],
  integration: [/integration|api|webhook|connect/i],
  documentation: [/documentation|docs|guide|tutorial/i],
  pricing: [/price|pricing|cost|billing|plan/i],
  security: [/security|privacy|data|password|login/i],
};

/**
 * Classify a single feedback item
 */
export function classifyFeedback(
  item: FeedbackItem,
  config: ClassificationConfig = DEFAULT_CONFIG
): ClassificationResult {
  const text = `${item.content.subject || ''} ${item.content.body}`.toLowerCase();
  const signals: string[] = [];
  const scores: Record<string, number> = {};

  // Score each classification
  for (const [type, patternConfig] of Object.entries(CLASSIFICATION_PATTERNS)) {
    let score = 0;

    // Check patterns
    for (const pattern of patternConfig.patterns) {
      const match = text.match(pattern);
      if (match) {
        score += 0.3;
        signals.push(match[0]);
      }
    }

    // Check keywords
    for (const keyword of patternConfig.keywords) {
      if (text.includes(keyword)) {
        score += 0.15;
        if (!signals.includes(keyword)) signals.push(keyword);
      }
    }

    scores[type] = Math.min(1, score * patternConfig.weight);
  }

  // Determine winner
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topClass, topScore] = sorted[0];
  const [secondClass, secondScore] = sorted[1] || [null, 0];

  // Calculate confidence (gap between top and second)
  const confidence = topScore > 0
    ? Math.min(1, topScore * (1 + (topScore - secondScore)))
    : 0.3;

  // Determine team
  const suggestedTeam = detectTeam(text);

  // Extract tags
  const tags = extractTags(text);

  // Calculate priority
  const suggestedPriority = calculatePriority(item, topClass, confidence, config);

  // Map to valid classification type
  const classification = mapToClassification(topClass);

  return {
    classification,
    confidence,
    signals: [...new Set(signals)].slice(0, 8),
    suggestedPriority,
    suggestedTeam,
    tags,
    needsReview: confidence < config.confidenceThreshold,
  };
}

/**
 * Map string classification to valid type
 */
function mapToClassification(type: string): ClassificationResult['classification'] {
  const mapping: Record<string, ClassificationResult['classification']> = {
    bug: 'bug',
    feature: 'feature',
    question: 'question',
    praise: 'praise',
    complaint: 'complaint',
    clarification: 'clarification',
  };
  return mapping[type] || 'clarification';
}

/**
 * Detect the most likely team based on content
 */
function detectTeam(text: string): DevTeam | undefined {
  let bestTeam: DevTeam | undefined;
  let bestScore = 0;

  for (const [team, config] of Object.entries(TEAM_PATTERNS)) {
    let score = 0;

    for (const pattern of config.patterns) {
      if (pattern.test(text)) score += 0.4;
    }

    for (const keyword of config.keywords) {
      if (text.includes(keyword)) score += 0.2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTeam = team as DevTeam;
    }
  }

  return bestScore >= 0.3 ? bestTeam : undefined;
}

/**
 * Extract relevant tags from text
 */
function extractTags(text: string): string[] {
  const tags: string[] = [];

  for (const [tag, patterns] of Object.entries(TAG_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        tags.push(tag);
        break;
      }
    }
  }

  return tags;
}

/**
 * Calculate priority based on multiple factors
 */
function calculatePriority(
  item: FeedbackItem,
  classification: string,
  confidence: number,
  config: ClassificationConfig
): KanbanPriority {
  let score = 0.5; // Base score (medium)

  // Classification boost
  if (classification === 'bug') score += 0.15;
  if (classification === 'complaint') score += 0.2;

  // Channel boost (public channels get priority)
  if (['x', 'facebook', 'instagram', 'trustpilot', 'app_store'].includes(item.channel)) {
    score += config.priorityBoosts.publicChannel;
  }

  // Follower boost
  if (item.author.followers && item.author.followers > 10000) {
    score += config.priorityBoosts.highFollowers;
  }

  // Verified user boost
  if (item.author.verified) {
    score += 0.1;
  }

  // Low rating boost
  if (item.rating && item.rating <= 2) {
    score += 0.2;
  }

  // Engagement boost (viral potential)
  if (item.engagement) {
    const totalEngagement = (item.engagement.likes || 0) +
      (item.engagement.retweets || 0) * 2 +
      (item.engagement.replies || 0);
    if (totalEngagement > 100) score += 0.15;
    if (totalEngagement > 1000) score += 0.15;
  }

  // Map score to priority
  if (score >= 0.85) return 'critical';
  if (score >= 0.65) return 'high';
  if (score >= 0.45) return 'medium';
  return 'low';
}

/**
 * Batch classify multiple items
 */
export function classifyFeedbackBatch(
  items: FeedbackItem[],
  config: ClassificationConfig = DEFAULT_CONFIG
): Map<string, ClassificationResult> {
  const results = new Map<string, ClassificationResult>();

  for (const item of items) {
    results.set(item.id, classifyFeedback(item, config));
  }

  return results;
}

/**
 * Get classification statistics from results
 */
export function getClassificationStats(results: Map<string, ClassificationResult>): {
  total: number;
  byClassification: Record<string, number>;
  byPriority: Record<KanbanPriority, number>;
  needsReview: number;
  avgConfidence: number;
} {
  const byClassification: Record<string, number> = {};
  const byPriority: Record<KanbanPriority, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  let needsReview = 0;
  let totalConfidence = 0;

  for (const result of results.values()) {
    byClassification[result.classification] = (byClassification[result.classification] || 0) + 1;
    byPriority[result.suggestedPriority]++;
    if (result.needsReview) needsReview++;
    totalConfidence += result.confidence;
  }

  return {
    total: results.size,
    byClassification,
    byPriority,
    needsReview,
    avgConfidence: results.size > 0 ? totalConfidence / results.size : 0,
  };
}

/**
 * Store a correction for learning
 */
export interface ClassificationCorrection {
  itemId: string;
  originalClassification: string;
  correctedClassification: string;
  correctedPriority?: KanbanPriority;
  correctedTeam?: DevTeam;
  correctedAt: string;
  correctedBy: string;
  feedbackText: string;
}

// In-memory corrections store (would be persisted to DB in production)
const corrections: ClassificationCorrection[] = [];

export function recordCorrection(correction: ClassificationCorrection): void {
  corrections.push(correction);
}

export function getCorrections(): ClassificationCorrection[] {
  return [...corrections];
}

export function getCorrectionStats(): {
  total: number;
  byOriginal: Record<string, number>;
  byCorrected: Record<string, number>;
} {
  const byOriginal: Record<string, number> = {};
  const byCorrected: Record<string, number> = {};

  for (const c of corrections) {
    byOriginal[c.originalClassification] = (byOriginal[c.originalClassification] || 0) + 1;
    byCorrected[c.correctedClassification] = (byCorrected[c.correctedClassification] || 0) + 1;
  }

  return { total: corrections.length, byOriginal, byCorrected };
}
