/**
 * Sentiment Analyzer
 * Classifies overall sentiment of feedback text using pattern matching
 * and keyword analysis for fast, local processing.
 */

import type { Sentiment } from './types/feedbackTypes';

export interface SentimentScore {
  sentiment: Sentiment;
  score: number; // -1 to 1 scale
  confidence: number; // 0 to 1
  signals: string[]; // Keywords/patterns that contributed to the score
}

export interface SentimentAnalysisResult {
  overall: SentimentScore;
  breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  keywords: Array<{ word: string; weight: number; category: 'positive' | 'negative' | 'neutral' }>;
}

// Weighted sentiment keywords
const POSITIVE_KEYWORDS: Record<string, number> = {
  // Strong positive
  'love': 0.9, 'amazing': 0.9, 'excellent': 0.9, 'fantastic': 0.9, 'wonderful': 0.9,
  'brilliant': 0.9, 'outstanding': 0.9, 'perfect': 0.9, 'incredible': 0.9,
  // Moderate positive
  'great': 0.7, 'good': 0.6, 'nice': 0.5, 'helpful': 0.7, 'useful': 0.6,
  'appreciate': 0.7, 'thanks': 0.5, 'thank': 0.5, 'pleased': 0.7, 'happy': 0.7,
  'enjoy': 0.6, 'like': 0.4, 'recommend': 0.7, 'impressed': 0.8,
  // Constructive
  'suggest': 0.3, 'idea': 0.3, 'feature': 0.2, 'would be nice': 0.4,
};

const NEGATIVE_KEYWORDS: Record<string, number> = {
  // Strong negative (frustration/anger)
  'hate': -0.9, 'terrible': -0.9, 'awful': -0.9, 'horrible': -0.9, 'worst': -0.9,
  'disgusting': -0.9, 'unacceptable': -0.9, 'outrageous': -0.9,
  // Moderate negative
  'bad': -0.7, 'poor': -0.7, 'disappointed': -0.6, 'frustrating': -0.8,
  'annoying': -0.7, 'broken': -0.8, 'bug': -0.5, 'crash': -0.8, 'error': -0.5,
  'issue': -0.4, 'problem': -0.5, 'fail': -0.7, 'failed': -0.7, 'doesn\'t work': -0.8,
  'not working': -0.8, 'useless': -0.8, 'waste': -0.7, 'slow': -0.5,
  // Mildly negative
  'confusing': -0.4, 'difficult': -0.3, 'hard': -0.2, 'unclear': -0.4,
  'missing': -0.4, 'lacking': -0.4, 'wish': -0.2, 'unfortunately': -0.4,
};

// Intensity modifiers
const INTENSIFIERS: Record<string, number> = {
  'very': 1.3, 'really': 1.3, 'extremely': 1.5, 'absolutely': 1.5,
  'totally': 1.4, 'completely': 1.4, 'so': 1.2, 'super': 1.3,
  'incredibly': 1.5, 'exceptionally': 1.5, 'utterly': 1.5,
};

const DIMINISHERS: Record<string, number> = {
  'slightly': 0.5, 'somewhat': 0.6, 'a bit': 0.6, 'kind of': 0.6,
  'sort of': 0.6, 'barely': 0.4, 'hardly': 0.4, 'little': 0.5,
};

// Negation words that flip sentiment
const NEGATIONS = new Set([
  'not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere',
  'cannot', 'can\'t', 'won\'t', 'don\'t', 'doesn\'t', 'didn\'t',
  'isn\'t', 'aren\'t', 'wasn\'t', 'weren\'t', 'hasn\'t', 'haven\'t',
]);

/**
 * Tokenize text into words, preserving phrases
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Check if a word is negated by looking at previous words
 */
function isNegated(tokens: string[], index: number, window = 3): boolean {
  const start = Math.max(0, index - window);
  for (let i = start; i < index; i++) {
    if (NEGATIONS.has(tokens[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Get intensity modifier for a word based on preceding modifiers
 */
function getIntensityModifier(tokens: string[], index: number): number {
  if (index === 0) return 1;

  const prevWord = tokens[index - 1];
  const prevTwoWords = index >= 2 ? `${tokens[index - 2]} ${tokens[index - 1]}` : '';

  // Check for two-word diminishers first
  if (DIMINISHERS[prevTwoWords]) return DIMINISHERS[prevTwoWords];
  if (DIMINISHERS[prevWord]) return DIMINISHERS[prevWord];

  if (INTENSIFIERS[prevWord]) return INTENSIFIERS[prevWord];

  return 1;
}

/**
 * Analyze sentiment of text
 */
export function analyzeSentiment(text: string): SentimentAnalysisResult {
  const tokens = tokenize(text);
  const signals: string[] = [];
  const keywords: Array<{ word: string; weight: number; category: 'positive' | 'negative' | 'neutral' }> = [];

  let positiveScore = 0;
  let negativeScore = 0;
  let matchCount = 0;

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    const isNeg = isNegated(tokens, i);
    const intensity = getIntensityModifier(tokens, i);

    // Check positive keywords
    if (POSITIVE_KEYWORDS[word]) {
      let weight = POSITIVE_KEYWORDS[word] * intensity;
      if (isNeg) weight = -weight; // Flip if negated

      if (weight > 0) {
        positiveScore += weight;
        keywords.push({ word, weight, category: 'positive' });
      } else {
        negativeScore += Math.abs(weight);
        keywords.push({ word, weight: Math.abs(weight), category: 'negative' });
      }
      signals.push(isNeg ? `not ${word}` : word);
      matchCount++;
    }

    // Check negative keywords
    if (NEGATIVE_KEYWORDS[word]) {
      let weight = Math.abs(NEGATIVE_KEYWORDS[word]) * intensity;
      if (isNeg) {
        // Double negation = positive
        positiveScore += weight * 0.5; // Reduced because double negation is weaker
        keywords.push({ word, weight: weight * 0.5, category: 'positive' });
      } else {
        negativeScore += weight;
        keywords.push({ word, weight, category: 'negative' });
      }
      signals.push(isNeg ? `not ${word}` : word);
      matchCount++;
    }

    // Check for multi-word phrases
    if (i < tokens.length - 1) {
      const phrase = `${word} ${tokens[i + 1]}`;
      if (POSITIVE_KEYWORDS[phrase]) {
        const weight = POSITIVE_KEYWORDS[phrase] * intensity;
        positiveScore += isNeg ? 0 : weight;
        negativeScore += isNeg ? weight : 0;
        signals.push(phrase);
        matchCount++;
      }
      if (NEGATIVE_KEYWORDS[phrase]) {
        const weight = Math.abs(NEGATIVE_KEYWORDS[phrase]) * intensity;
        negativeScore += isNeg ? 0 : weight;
        positiveScore += isNeg ? weight * 0.5 : 0;
        signals.push(phrase);
        matchCount++;
      }
    }
  }

  // Normalize scores
  const total = positiveScore + negativeScore;
  const normalizedPositive = total > 0 ? positiveScore / total : 0.5;
  const normalizedNegative = total > 0 ? negativeScore / total : 0.5;

  // Calculate overall score (-1 to 1)
  const score = total > 0 ? (positiveScore - negativeScore) / total : 0;

  // Calculate confidence based on match count and text length
  const confidence = Math.min(1, (matchCount * 2) / Math.max(tokens.length, 1));

  // Determine sentiment category
  const sentiment = scoresToSentiment(score, positiveScore, negativeScore);

  return {
    overall: {
      sentiment,
      score,
      confidence: Math.max(0.3, confidence), // Minimum confidence threshold
      signals: signals.slice(0, 10), // Top 10 signals
    },
    breakdown: {
      positive: normalizedPositive,
      negative: normalizedNegative,
      neutral: 1 - Math.abs(score),
    },
    keywords: keywords.slice(0, 15), // Top 15 keywords
  };
}

/**
 * Convert numeric scores to sentiment category
 */
function scoresToSentiment(score: number, positive: number, negative: number): Sentiment {
  if (score >= 0.6) return 'helpful';
  if (score >= 0.3) return 'constructive';
  if (score >= -0.1) return 'neutral';
  if (score >= -0.4) return 'disappointed';
  if (score >= -0.7) return 'frustrated';
  return 'angry';
}

/**
 * Get a human-readable sentiment label
 */
export function getSentimentLabel(sentiment: Sentiment): string {
  const labels: Record<Sentiment, string> = {
    angry: 'Very Negative',
    frustrated: 'Negative',
    disappointed: 'Somewhat Negative',
    neutral: 'Neutral',
    constructive: 'Constructive',
    helpful: 'Positive',
    mocking: 'Sarcastic',
  };
  return labels[sentiment] || 'Unknown';
}

/**
 * Batch analyze multiple items
 */
export function analyzeSentimentBatch(texts: string[]): SentimentAnalysisResult[] {
  return texts.map(text => analyzeSentiment(text));
}

/**
 * Get aggregate sentiment stats for a collection
 */
export function aggregateSentiments(results: SentimentAnalysisResult[]): {
  averageScore: number;
  distribution: Record<Sentiment, number>;
  topKeywords: Array<{ word: string; count: number; avgWeight: number }>;
} {
  if (results.length === 0) {
    return {
      averageScore: 0,
      distribution: {
        angry: 0, frustrated: 0, disappointed: 0, neutral: 0,
        constructive: 0, helpful: 0, mocking: 0,
      },
      topKeywords: [],
    };
  }

  const distribution: Record<Sentiment, number> = {
    angry: 0, frustrated: 0, disappointed: 0, neutral: 0,
    constructive: 0, helpful: 0, mocking: 0,
  };

  const keywordStats = new Map<string, { count: number; totalWeight: number }>();
  let totalScore = 0;

  for (const result of results) {
    totalScore += result.overall.score;
    distribution[result.overall.sentiment]++;

    for (const kw of result.keywords) {
      const existing = keywordStats.get(kw.word) || { count: 0, totalWeight: 0 };
      existing.count++;
      existing.totalWeight += kw.weight;
      keywordStats.set(kw.word, existing);
    }
  }

  const topKeywords = Array.from(keywordStats.entries())
    .map(([word, stats]) => ({
      word,
      count: stats.count,
      avgWeight: stats.totalWeight / stats.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    averageScore: totalScore / results.length,
    distribution,
    topKeywords,
  };
}
