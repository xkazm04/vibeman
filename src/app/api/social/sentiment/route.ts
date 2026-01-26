import { NextRequest, NextResponse } from 'next/server';
import { analyzeSentiment, aggregateSentiments } from '@/app/features/Social/lib/sentimentAnalyzer';
import { detectEmotions, aggregateEmotions } from '@/app/features/Social/lib/emotionDetector';
import { parseUrgency, aggregateUrgency } from '@/app/features/Social/lib/urgencyParser';
import type { Sentiment } from '@/app/features/Social/lib/types/feedbackTypes';

interface FeedbackItemPayload {
  id: string;
  text: string;
  timestamp?: string;
}

interface AnalysisResult {
  id: string;
  sentiment: {
    sentiment: Sentiment;
    score: number;
    confidence: number;
    signals: string[];
    breakdown: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
  emotions: {
    primary: {
      type: string;
      intensity: number;
      confidence: number;
      signals: string[];
    } | null;
    secondary: Array<{
      type: string;
      intensity: number;
    }>;
    emotionalIntensity: number;
    needsAttention: boolean;
  };
  urgency: {
    level: string;
    score: number;
    isTimeSensitive: boolean;
    isBlocking: boolean;
    suggestedResponseTime: string;
    signals: Array<{
      type: string;
      phrase: string;
      weight: number;
    }>;
  };
  escalation: {
    shouldEscalate: boolean;
    severity: 'critical' | 'high' | 'medium' | 'low';
    reasons: string[];
  };
}

/**
 * POST /api/social/sentiment
 * Analyze sentiment, emotions, and urgency for feedback items
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body as { items: FeedbackItemPayload[] };

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json({ results: [], aggregates: null });
    }

    // Analyze each item
    const results: AnalysisResult[] = items.map((item) => {
      const sentimentResult = analyzeSentiment(item.text);
      const emotionResult = detectEmotions(item.text);
      const urgencyResult = parseUrgency(item.text);

      // Determine escalation
      const escalation = determineEscalation(sentimentResult, emotionResult, urgencyResult);

      return {
        id: item.id,
        sentiment: {
          sentiment: sentimentResult.overall.sentiment,
          score: sentimentResult.overall.score,
          confidence: sentimentResult.overall.confidence,
          signals: sentimentResult.overall.signals,
          breakdown: sentimentResult.breakdown,
        },
        emotions: {
          primary: emotionResult.primary
            ? {
                type: emotionResult.primary.type,
                intensity: emotionResult.primary.intensity,
                confidence: emotionResult.primary.confidence,
                signals: emotionResult.primary.signals,
              }
            : null,
          secondary: emotionResult.secondary.map((e) => ({
            type: e.type,
            intensity: e.intensity,
          })),
          emotionalIntensity: emotionResult.emotionalIntensity,
          needsAttention: emotionResult.needsAttention,
        },
        urgency: {
          level: urgencyResult.level,
          score: urgencyResult.score,
          isTimeSensitive: urgencyResult.isTimeSensitive,
          isBlocking: urgencyResult.isBlocking,
          suggestedResponseTime: urgencyResult.suggestedResponseTime,
          signals: urgencyResult.signals,
        },
        escalation,
      };
    });

    // Calculate aggregates
    const sentimentResults = items.map((item) => analyzeSentiment(item.text));
    const emotionResults = items.map((item) => detectEmotions(item.text));
    const urgencyResults = items.map((item) => parseUrgency(item.text));

    const aggregates = {
      sentiment: aggregateSentiments(sentimentResults),
      emotions: aggregateEmotions(emotionResults),
      urgency: aggregateUrgency(urgencyResults),
      escalationSummary: {
        total: results.filter((r) => r.escalation.shouldEscalate).length,
        critical: results.filter((r) => r.escalation.severity === 'critical').length,
        high: results.filter((r) => r.escalation.severity === 'high').length,
        medium: results.filter((r) => r.escalation.severity === 'medium').length,
      },
    };

    return NextResponse.json({ results, aggregates });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze sentiment' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/social/sentiment
 * Get sentiment analysis for a single text string (via query param)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');

    if (!text) {
      return NextResponse.json(
        { error: 'Text query parameter is required' },
        { status: 400 }
      );
    }

    const sentimentResult = analyzeSentiment(text);
    const emotionResult = detectEmotions(text);
    const urgencyResult = parseUrgency(text);
    const escalation = determineEscalation(sentimentResult, emotionResult, urgencyResult);

    return NextResponse.json({
      sentiment: {
        sentiment: sentimentResult.overall.sentiment,
        score: sentimentResult.overall.score,
        confidence: sentimentResult.overall.confidence,
        signals: sentimentResult.overall.signals,
        breakdown: sentimentResult.breakdown,
        keywords: sentimentResult.keywords,
      },
      emotions: {
        primary: emotionResult.primary,
        secondary: emotionResult.secondary,
        allEmotions: emotionResult.allEmotions,
        emotionalIntensity: emotionResult.emotionalIntensity,
        needsAttention: emotionResult.needsAttention,
      },
      urgency: urgencyResult,
      escalation,
    });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze sentiment' },
      { status: 500 }
    );
  }
}

/**
 * Determine if feedback should be escalated based on combined analysis
 */
function determineEscalation(
  sentiment: ReturnType<typeof analyzeSentiment>,
  emotions: ReturnType<typeof detectEmotions>,
  urgency: ReturnType<typeof parseUrgency>
): { shouldEscalate: boolean; severity: 'critical' | 'high' | 'medium' | 'low'; reasons: string[] } {
  const reasons: string[] = [];
  let severityScore = 0;

  // Check sentiment
  if (sentiment.overall.sentiment === 'angry') {
    reasons.push('angry_customer');
    severityScore += 3;
  } else if (sentiment.overall.sentiment === 'frustrated') {
    reasons.push('frustrated_customer');
    severityScore += 2;
  }

  // Check emotions
  if (emotions.needsAttention) {
    reasons.push('high_emotional_intensity');
    severityScore += 2;
  }

  if (emotions.primary?.type === 'anger' && emotions.primary.intensity >= 0.7) {
    reasons.push('high_anger_level');
    severityScore += 3;
  }

  if (emotions.primary?.type === 'anxiety' && emotions.primary.intensity >= 0.6) {
    reasons.push('customer_anxiety');
    severityScore += 1;
  }

  // Check urgency
  if (urgency.level === 'critical') {
    reasons.push('critical_urgency');
    severityScore += 4;
  } else if (urgency.level === 'high') {
    reasons.push('high_urgency');
    severityScore += 2;
  }

  if (urgency.isBlocking) {
    reasons.push('blocking_issue');
    severityScore += 2;
  }

  // Check for legal mentions
  const hasLegalMention = urgency.signals.some(
    (s) => s.type === 'escalation' && (s.phrase.includes('legal') || s.phrase.includes('lawyer') || s.phrase.includes('sue'))
  );
  if (hasLegalMention) {
    reasons.push('legal_mention');
    severityScore += 5;
  }

  // Determine severity and whether to escalate
  let severity: 'critical' | 'high' | 'medium' | 'low';
  if (severityScore >= 6) {
    severity = 'critical';
  } else if (severityScore >= 4) {
    severity = 'high';
  } else if (severityScore >= 2) {
    severity = 'medium';
  } else {
    severity = 'low';
  }

  const shouldEscalate = severityScore >= 2;

  return { shouldEscalate, severity, reasons };
}
