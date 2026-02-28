import { NextRequest, NextResponse } from 'next/server';
import {
  classifyFeedback,
  classifyFeedbackBatch,
  getClassificationStats,
  recordCorrection,
  getCorrections,
  getCorrectionStats,
  type ClassificationConfig,
  type ClassificationCorrection,
} from '@/app/features/Social/lib/feedbackClassifier';
import {
  calculatePriorityScore,
  type PriorityConfig,
} from '@/app/features/Social/lib/priorityScorer';
import {
  routeFeedback,
  type RoutingContext,
} from '@/app/features/Social/lib/feedbackRouter';
import { analyzeSentiment } from '@/app/features/Social/lib/sentimentAnalyzer';
import { detectEmotions } from '@/app/features/Social/lib/emotionDetector';
import { parseUrgency } from '@/app/features/Social/lib/urgencyParser';
import type { FeedbackItem } from '@/app/features/Social/lib/types/feedbackTypes';

/**
 * POST /api/social/classify
 * Classify feedback items with full analysis pipeline
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      config,
      includeRouting = true,
      includePriority = true,
      includeSentiment = true,
    } = body as {
      items: FeedbackItem[];
      config?: Partial<ClassificationConfig>;
      includeRouting?: boolean;
      includePriority?: boolean;
      includeSentiment?: boolean;
    };

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json({
        results: [],
        stats: {
          total: 0,
          byClassification: {},
          byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
          needsReview: 0,
          avgConfidence: 0,
        },
      });
    }

    // Merge config with defaults
    const classificationConfig: ClassificationConfig = {
      confidenceThreshold: config?.confidenceThreshold ?? 0.7,
      enableLLMFallback: config?.enableLLMFallback ?? true,
      priorityBoosts: {
        vipCustomer: config?.priorityBoosts?.vipCustomer ?? 0.2,
        highFollowers: config?.priorityBoosts?.highFollowers ?? 0.1,
        publicChannel: config?.priorityBoosts?.publicChannel ?? 0.15,
        repeatContact: config?.priorityBoosts?.repeatContact ?? 0.15,
      },
    };

    // Classify all items
    const classificationResults = classifyFeedbackBatch(items, classificationConfig);

    // Build full results with optional analysis
    const results = items.map((item) => {
      const classification = classificationResults.get(item.id)!;
      const text = `${item.content.subject || ''} ${item.content.body}`;

      // Optional sentiment/emotion/urgency analysis
      let sentiment = null;
      let emotions = null;
      let urgency = null;

      if (includeSentiment) {
        sentiment = analyzeSentiment(text);
        emotions = detectEmotions(text);
        urgency = parseUrgency(text);
      }

      // Optional priority scoring
      let priority = null;
      if (includePriority) {
        priority = calculatePriorityScore(item, {
          classification,
          sentiment: sentiment || undefined,
          emotion: emotions || undefined,
          urgency: urgency || undefined,
        });
      }

      // Optional routing
      let routing = null;
      if (includeRouting) {
        const routingContext: RoutingContext = {
          item,
          classification,
          priorityScore: priority || undefined,
          sentiment: sentiment
            ? { score: sentiment.overall.score, sentiment: sentiment.overall.sentiment }
            : undefined,
          urgency: urgency
            ? { level: urgency.level, score: urgency.score }
            : undefined,
        };
        routing = routeFeedback(routingContext);
      }

      return {
        id: item.id,
        classification: {
          type: classification.classification,
          confidence: classification.confidence,
          signals: classification.signals,
          suggestedTeam: classification.suggestedTeam,
          tags: classification.tags,
          needsReview: classification.needsReview,
        },
        priority: priority
          ? {
              level: priority.priority,
              score: priority.score,
              topFactors: priority.topFactors,
              suggestedResponseTime: priority.suggestedResponseTime,
            }
          : null,
        sentiment: sentiment
          ? {
              sentiment: sentiment.overall.sentiment,
              score: sentiment.overall.score,
              confidence: sentiment.overall.confidence,
            }
          : null,
        emotions: emotions
          ? {
              primary: emotions.primary?.type || null,
              intensity: emotions.emotionalIntensity,
              needsAttention: emotions.needsAttention,
            }
          : null,
        urgency: urgency
          ? {
              level: urgency.level,
              score: urgency.score,
              isBlocking: urgency.isBlocking,
            }
          : null,
        routing: routing
          ? {
              finalColumn: routing.finalColumn,
              finalPriority: routing.finalPriority,
              assignedTeam: routing.assignedTeam,
              addedTags: routing.addedTags,
              flaggedForReview: routing.flaggedForReview,
              matchedRules: routing.matchedRules.map((r) => r.ruleName),
            }
          : null,
      };
    });

    // Calculate stats
    const stats = getClassificationStats(classificationResults);

    // Items needing review
    const needsReviewItems = results.filter(
      (r) => r.classification.needsReview || r.routing?.flaggedForReview
    );

    return NextResponse.json({
      results,
      stats,
      needsReview: needsReviewItems.map((r) => r.id),
      needsReviewCount: needsReviewItems.length,
    });
  } catch (error) {
    console.error('Classification error:', error);
    return NextResponse.json(
      { error: 'Failed to classify feedback' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/social/classify
 * Get classification for a single text (quick lookup)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const channel = searchParams.get('channel') || 'email';

    if (!text) {
      return NextResponse.json(
        { error: 'Text query parameter is required' },
        { status: 400 }
      );
    }

    // Create a minimal feedback item for classification
    const mockItem: FeedbackItem = {
      id: 'temp-' + Date.now(),
      channel: channel as FeedbackItem['channel'],
      timestamp: new Date().toISOString(),
      status: 'new',
      priority: 'medium',
      author: { name: 'Unknown' },
      content: { body: text },
      tags: [],
    };

    const classification = classifyFeedback(mockItem);
    const sentiment = analyzeSentiment(text);
    const emotions = detectEmotions(text);
    const urgency = parseUrgency(text);

    return NextResponse.json({
      classification: {
        type: classification.classification,
        confidence: classification.confidence,
        signals: classification.signals,
        suggestedTeam: classification.suggestedTeam,
        tags: classification.tags,
        needsReview: classification.needsReview,
      },
      sentiment: {
        sentiment: sentiment.overall.sentiment,
        score: sentiment.overall.score,
        confidence: sentiment.overall.confidence,
        signals: sentiment.overall.signals,
      },
      emotions: {
        primary: emotions.primary,
        secondary: emotions.secondary,
        intensity: emotions.emotionalIntensity,
        needsAttention: emotions.needsAttention,
      },
      urgency: {
        level: urgency.level,
        score: urgency.score,
        isBlocking: urgency.isBlocking,
        isTimeSensitive: urgency.isTimeSensitive,
        suggestedResponseTime: urgency.suggestedResponseTime,
      },
    });
  } catch (error) {
    console.error('Classification error:', error);
    return NextResponse.json(
      { error: 'Failed to classify text' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/social/classify
 * Record a classification correction for learning
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      itemId,
      originalClassification,
      correctedClassification,
      correctedPriority,
      correctedTeam,
      feedbackText,
      correctedBy = 'anonymous',
    } = body as {
      itemId: string;
      originalClassification: string;
      correctedClassification: string;
      correctedPriority?: string;
      correctedTeam?: string;
      feedbackText: string;
      correctedBy?: string;
    };

    if (!itemId || !originalClassification || !correctedClassification || !feedbackText) {
      return NextResponse.json(
        { error: 'Missing required fields: itemId, originalClassification, correctedClassification, feedbackText' },
        { status: 400 }
      );
    }

    const correction: ClassificationCorrection = {
      itemId,
      originalClassification,
      correctedClassification,
      correctedPriority: correctedPriority as ClassificationCorrection['correctedPriority'],
      correctedTeam: correctedTeam as ClassificationCorrection['correctedTeam'],
      correctedAt: new Date().toISOString(),
      correctedBy,
      feedbackText,
    };

    recordCorrection(correction);

    // Get updated stats
    const stats = getCorrectionStats();

    return NextResponse.json({
      success: true,
      correction,
      stats,
    });
  } catch (error) {
    console.error('Correction recording error:', error);
    return NextResponse.json(
      { error: 'Failed to record correction' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/classify
 * Get correction history and stats
 */
export async function DELETE(request: NextRequest) {
  // Using DELETE for getting corrections (unusual but avoiding adding another route)
  // In production, this should be a separate /api/social/classify/corrections endpoint
  try {
    const corrections = getCorrections();
    const stats = getCorrectionStats();

    return NextResponse.json({
      corrections,
      stats,
    });
  } catch (error) {
    console.error('Error fetching corrections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch corrections' },
      { status: 500 }
    );
  }
}
