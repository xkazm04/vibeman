/**
 * Priority Scorer
 * Assigns priority levels to feedback items based on multiple factors
 * including sentiment, urgency, customer context, and content analysis.
 */

import type { FeedbackItem, KanbanPriority } from './types/feedbackTypes';
import type { SentimentAnalysisResult } from './sentimentAnalyzer';
import type { EmotionAnalysisResult } from './emotionDetector';
import type { UrgencyAnalysisResult } from './urgencyParser';
import type { ClassificationResult } from './feedbackClassifier';

export interface PriorityFactors {
  sentiment?: SentimentAnalysisResult;
  emotion?: EmotionAnalysisResult;
  urgency?: UrgencyAnalysisResult;
  classification?: ClassificationResult;
}

export interface PriorityScore {
  priority: KanbanPriority;
  score: number; // 0 to 100
  breakdown: {
    base: number;
    sentimentBoost: number;
    emotionBoost: number;
    urgencyBoost: number;
    classificationBoost: number;
    channelBoost: number;
    engagementBoost: number;
    customerBoost: number;
  };
  topFactors: string[];
  suggestedResponseTime: string;
}

export interface PriorityConfig {
  weights: {
    sentiment: number;
    emotion: number;
    urgency: number;
    classification: number;
    channel: number;
    engagement: number;
    customer: number;
  };
  thresholds: {
    critical: number;
    high: number;
    medium: number;
  };
  responseTimeMinutes: Record<KanbanPriority, number>;
}

// Default configuration
const DEFAULT_CONFIG: PriorityConfig = {
  weights: {
    sentiment: 1.0,
    emotion: 1.0,
    urgency: 1.5, // Urgency weighted higher
    classification: 0.8,
    channel: 0.6,
    engagement: 0.5,
    customer: 0.7,
  },
  thresholds: {
    critical: 80,
    high: 60,
    medium: 35,
  },
  responseTimeMinutes: {
    critical: 60, // 1 hour
    high: 240, // 4 hours
    medium: 1440, // 24 hours
    low: 4320, // 3 days
  },
};

// Channel priority weights (public channels get higher scores)
const CHANNEL_WEIGHTS: Record<string, number> = {
  x: 20, // Twitter/X - highly public
  facebook: 18,
  instagram: 17,
  trustpilot: 15, // Reviews visible to prospects
  app_store: 15,
  email: 8, // Private channel
  support_chat: 10,
};

/**
 * Calculate priority score for a feedback item
 */
export function calculatePriorityScore(
  item: FeedbackItem,
  factors: PriorityFactors,
  config: PriorityConfig = DEFAULT_CONFIG
): PriorityScore {
  const breakdown = {
    base: 25, // Base score
    sentimentBoost: 0,
    emotionBoost: 0,
    urgencyBoost: 0,
    classificationBoost: 0,
    channelBoost: 0,
    engagementBoost: 0,
    customerBoost: 0,
  };

  const topFactors: string[] = [];

  // 1. Sentiment boost
  if (factors.sentiment) {
    const sentimentScore = factors.sentiment.overall.score;
    // Negative sentiment increases priority
    if (sentimentScore < -0.5) {
      breakdown.sentimentBoost = 15 * config.weights.sentiment;
      topFactors.push('Very negative sentiment');
    } else if (sentimentScore < -0.2) {
      breakdown.sentimentBoost = 10 * config.weights.sentiment;
      topFactors.push('Negative sentiment');
    } else if (sentimentScore < 0) {
      breakdown.sentimentBoost = 5 * config.weights.sentiment;
    }
  }

  // 2. Emotion boost
  if (factors.emotion) {
    if (factors.emotion.needsAttention) {
      breakdown.emotionBoost += 12 * config.weights.emotion;
      topFactors.push('High emotional intensity');
    }

    const primary = factors.emotion.primary;
    if (primary) {
      if (primary.type === 'anger' && primary.intensity >= 0.7) {
        breakdown.emotionBoost += 10 * config.weights.emotion;
        topFactors.push('Angry customer');
      } else if (primary.type === 'frustration' && primary.intensity >= 0.6) {
        breakdown.emotionBoost += 8 * config.weights.emotion;
        topFactors.push('Frustrated customer');
      } else if (primary.type === 'anxiety' && primary.intensity >= 0.5) {
        breakdown.emotionBoost += 6 * config.weights.emotion;
        topFactors.push('Anxious customer');
      }
    }
  }

  // 3. Urgency boost
  if (factors.urgency) {
    switch (factors.urgency.level) {
      case 'critical':
        breakdown.urgencyBoost = 20 * config.weights.urgency;
        topFactors.push('Critical urgency');
        break;
      case 'high':
        breakdown.urgencyBoost = 15 * config.weights.urgency;
        topFactors.push('High urgency');
        break;
      case 'medium':
        breakdown.urgencyBoost = 8 * config.weights.urgency;
        break;
      case 'low':
        breakdown.urgencyBoost = 3 * config.weights.urgency;
        break;
    }

    if (factors.urgency.isBlocking) {
      breakdown.urgencyBoost += 10 * config.weights.urgency;
      topFactors.push('Blocking issue');
    }

    if (factors.urgency.isTimeSensitive) {
      breakdown.urgencyBoost += 5 * config.weights.urgency;
      topFactors.push('Time-sensitive');
    }
  }

  // 4. Classification boost
  if (factors.classification) {
    if (factors.classification.classification === 'bug') {
      breakdown.classificationBoost = 8 * config.weights.classification;
    } else if (factors.classification.classification === 'complaint') {
      breakdown.classificationBoost = 12 * config.weights.classification;
      topFactors.push('Customer complaint');
    }

    // Low confidence items need attention
    if (factors.classification.needsReview) {
      breakdown.classificationBoost += 5 * config.weights.classification;
      topFactors.push('Low confidence - needs review');
    }
  }

  // 5. Channel boost
  const channelWeight = CHANNEL_WEIGHTS[item.channel] || 5;
  breakdown.channelBoost = channelWeight * config.weights.channel * 0.5;

  if (['x', 'facebook', 'instagram'].includes(item.channel)) {
    topFactors.push('Public social channel');
  }

  // 6. Engagement boost
  if (item.engagement) {
    const totalEngagement =
      (item.engagement.likes || 0) +
      (item.engagement.retweets || 0) * 2 +
      (item.engagement.replies || 0) * 1.5 +
      (item.engagement.views || 0) * 0.01;

    if (totalEngagement > 1000) {
      breakdown.engagementBoost = 15 * config.weights.engagement;
      topFactors.push('High engagement/viral');
    } else if (totalEngagement > 100) {
      breakdown.engagementBoost = 8 * config.weights.engagement;
      topFactors.push('Moderate engagement');
    } else if (totalEngagement > 10) {
      breakdown.engagementBoost = 3 * config.weights.engagement;
    }
  }

  // 7. Customer boost
  // VIP/verified users
  if (item.author.verified) {
    breakdown.customerBoost += 10 * config.weights.customer;
    topFactors.push('Verified user');
  }

  // High follower count
  if (item.author.followers) {
    if (item.author.followers > 100000) {
      breakdown.customerBoost += 15 * config.weights.customer;
      topFactors.push('High-profile user (100k+ followers)');
    } else if (item.author.followers > 10000) {
      breakdown.customerBoost += 8 * config.weights.customer;
      topFactors.push('Notable user (10k+ followers)');
    }
  }

  // Low rating
  if (item.rating !== undefined) {
    if (item.rating <= 1) {
      breakdown.customerBoost += 10 * config.weights.customer;
      topFactors.push('1-star rating');
    } else if (item.rating <= 2) {
      breakdown.customerBoost += 6 * config.weights.customer;
      topFactors.push('2-star rating');
    }
  }

  // Calculate total score
  const score = Math.min(100, Math.round(
    breakdown.base +
    breakdown.sentimentBoost +
    breakdown.emotionBoost +
    breakdown.urgencyBoost +
    breakdown.classificationBoost +
    breakdown.channelBoost +
    breakdown.engagementBoost +
    breakdown.customerBoost
  ));

  // Determine priority level
  let priority: KanbanPriority;
  if (score >= config.thresholds.critical) {
    priority = 'critical';
  } else if (score >= config.thresholds.high) {
    priority = 'high';
  } else if (score >= config.thresholds.medium) {
    priority = 'medium';
  } else {
    priority = 'low';
  }

  // Get suggested response time
  const responseMinutes = config.responseTimeMinutes[priority];
  const suggestedResponseTime = formatResponseTime(responseMinutes);

  return {
    priority,
    score,
    breakdown,
    topFactors: topFactors.slice(0, 5),
    suggestedResponseTime,
  };
}

/**
 * Format minutes to human-readable response time
 */
function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `within ${minutes} minutes`;
  if (minutes < 1440) return `within ${Math.round(minutes / 60)} hours`;
  return `within ${Math.round(minutes / 1440)} days`;
}

/**
 * Batch calculate priorities
 */
export function calculatePriorityBatch(
  items: Array<{ item: FeedbackItem; factors: PriorityFactors }>,
  config: PriorityConfig = DEFAULT_CONFIG
): Map<string, PriorityScore> {
  const results = new Map<string, PriorityScore>();

  for (const { item, factors } of items) {
    results.set(item.id, calculatePriorityScore(item, factors, config));
  }

  return results;
}

/**
 * Get priority distribution stats
 */
export function getPriorityStats(scores: Map<string, PriorityScore>): {
  total: number;
  byPriority: Record<KanbanPriority, number>;
  avgScore: number;
  scoreDistribution: { min: number; max: number; median: number };
  topFactors: Array<{ factor: string; count: number }>;
} {
  const byPriority: Record<KanbanPriority, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const allScores: number[] = [];
  const factorCounts: Record<string, number> = {};

  for (const score of scores.values()) {
    byPriority[score.priority]++;
    allScores.push(score.score);

    for (const factor of score.topFactors) {
      factorCounts[factor] = (factorCounts[factor] || 0) + 1;
    }
  }

  allScores.sort((a, b) => a - b);

  const topFactors = Object.entries(factorCounts)
    .map(([factor, count]) => ({ factor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total: scores.size,
    byPriority,
    avgScore: allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0,
    scoreDistribution: {
      min: allScores[0] || 0,
      max: allScores[allScores.length - 1] || 0,
      median: allScores[Math.floor(allScores.length / 2)] || 0,
    },
    topFactors,
  };
}

/**
 * Get priority color classes
 */
export function getPriorityColors(priority: KanbanPriority): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const colors: Record<KanbanPriority, { bg: string; text: string; border: string; dot: string }> = {
    critical: {
      bg: 'bg-red-500/15',
      text: 'text-red-400',
      border: 'border-red-500/40',
      dot: 'bg-red-500',
    },
    high: {
      bg: 'bg-orange-500/15',
      text: 'text-orange-400',
      border: 'border-orange-500/40',
      dot: 'bg-orange-500',
    },
    medium: {
      bg: 'bg-yellow-500/15',
      text: 'text-yellow-400',
      border: 'border-yellow-500/40',
      dot: 'bg-yellow-500',
    },
    low: {
      bg: 'bg-green-500/15',
      text: 'text-green-400',
      border: 'border-green-500/40',
      dot: 'bg-green-500',
    },
  };
  return colors[priority];
}

/**
 * Compare two priority levels
 * Returns positive if a > b, negative if a < b, 0 if equal
 */
export function comparePriorities(a: KanbanPriority, b: KanbanPriority): number {
  const order: Record<KanbanPriority, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return order[a] - order[b];
}
