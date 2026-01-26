/**
 * Emotion Detector
 * Identifies specific emotions (frustration, confusion, excitement)
 * in feedback text using pattern matching and linguistic cues.
 */

export type EmotionType =
  | 'frustration'
  | 'confusion'
  | 'excitement'
  | 'disappointment'
  | 'gratitude'
  | 'anxiety'
  | 'anger'
  | 'satisfaction';

export interface DetectedEmotion {
  type: EmotionType;
  intensity: number; // 0 to 1
  confidence: number; // 0 to 1
  signals: string[]; // Phrases that triggered this emotion
}

export interface EmotionAnalysisResult {
  primary: DetectedEmotion | null;
  secondary: DetectedEmotion[];
  allEmotions: DetectedEmotion[];
  emotionalIntensity: number; // Overall emotional charge 0-1
  needsAttention: boolean; // High-intensity negative emotions
}

// Emotion patterns with example phrases and weights
const EMOTION_PATTERNS: Record<EmotionType, { patterns: RegExp[]; keywords: string[]; weight: number }> = {
  frustration: {
    patterns: [
      /why (can't|won't|doesn't|isn't)/i,
      /tried (everything|multiple|many|several)/i,
      /nothing (works|helps)/i,
      /still (not working|broken|failing)/i,
      /been (trying|waiting|dealing)/i,
      /over and over/i,
      /how many times/i,
      /what( the|'s) (wrong|going on)/i,
      /fed up/i,
      /sick (of|and tired)/i,
      /had enough/i,
    ],
    keywords: [
      'frustrating', 'frustrated', 'annoying', 'annoyed', 'irritating',
      'irritated', 'ugh', 'argh', 'grrr', 'sigh', 'smh', 'ffs',
    ],
    weight: 0.8,
  },
  confusion: {
    patterns: [
      /don't understand/i,
      /doesn't make sense/i,
      /how (do|does|can|should) (i|you|we|one)/i,
      /what (does|is|do) .+ mean/i,
      /unclear/i,
      /where (do|can|should)/i,
      /can someone explain/i,
      /lost/i,
      /no idea/i,
      /confused about/i,
    ],
    keywords: [
      'confused', 'confusing', 'unclear', 'lost', 'puzzled', 'baffled',
      'bewildered', 'perplexed', 'huh', 'what', 'how',
    ],
    weight: 0.6,
  },
  excitement: {
    patterns: [
      /can't wait/i,
      /so excited/i,
      /this is (amazing|awesome|incredible|fantastic)/i,
      /love (this|it|the)/i,
      /finally/i,
      /best (thing|feature|app)/i,
      /blown away/i,
      /game changer/i,
    ],
    keywords: [
      'excited', 'thrilled', 'amazing', 'awesome', 'fantastic', 'incredible',
      'wonderful', 'brilliant', 'wow', 'omg', 'yay', 'woohoo',
    ],
    weight: 0.7,
  },
  disappointment: {
    patterns: [
      /expected (better|more|different)/i,
      /was (hoping|expecting)/i,
      /let (me |us )?down/i,
      /not what (i|we) (expected|wanted|hoped)/i,
      /wish (it|this|you)/i,
      /used to be/i,
      /miss the old/i,
      /disappointed (with|by|in)/i,
    ],
    keywords: [
      'disappointed', 'disappointing', 'letdown', 'underwhelming', 'meh',
      'mediocre', 'subpar', 'lackluster',
    ],
    weight: 0.65,
  },
  gratitude: {
    patterns: [
      /thank you (so much|very much)/i,
      /thanks (a lot|so much)/i,
      /really appreciate/i,
      /grateful (for|to)/i,
      /you('re| are) (the best|awesome|amazing)/i,
      /saved (my|the) (day|life)/i,
      /lifesaver/i,
    ],
    keywords: [
      'thanks', 'thank', 'grateful', 'appreciate', 'appreciated',
      'thankful', 'blessed',
    ],
    weight: 0.7,
  },
  anxiety: {
    patterns: [
      /worried (about|that)/i,
      /concerned (about|that)/i,
      /scared (of|that)/i,
      /afraid (of|that)/i,
      /will (i|we) lose/i,
      /what if/i,
      /urgent/i,
      /asap/i,
      /emergency/i,
      /please help/i,
      /need help (urgently|now|immediately)/i,
    ],
    keywords: [
      'worried', 'concerned', 'anxious', 'nervous', 'scared', 'afraid',
      'fearful', 'panicking', 'urgent', 'emergency',
    ],
    weight: 0.75,
  },
  anger: {
    patterns: [
      /hate (this|it|you)/i,
      /worst (thing|app|experience|company)/i,
      /never (using|buying|recommending)/i,
      /want (my money|a refund)/i,
      /sue|lawsuit|lawyer/i,
      /scam|fraud|ripoff|rip-off/i,
      /unacceptable/i,
      /how dare/i,
      /you (should be|are) (ashamed|embarrassed)/i,
    ],
    keywords: [
      'hate', 'angry', 'furious', 'outraged', 'livid', 'infuriated',
      'enraged', 'mad', 'pissed', 'disgusted',
    ],
    weight: 0.9,
  },
  satisfaction: {
    patterns: [
      /works (great|perfectly|well)/i,
      /exactly what (i|we) (needed|wanted)/i,
      /problem solved/i,
      /fixed (my|the) (issue|problem)/i,
      /happy (with|about)/i,
      /pleased (with|to)/i,
      /does the job/i,
      /no complaints/i,
    ],
    keywords: [
      'satisfied', 'happy', 'pleased', 'content', 'good', 'great',
      'perfect', 'excellent', 'works',
    ],
    weight: 0.65,
  },
};

// Intensity modifiers
const INTENSITY_BOOSTERS = [
  'very', 'really', 'extremely', 'absolutely', 'totally', 'completely',
  'so', 'super', 'incredibly', 'unbelievably', 'ridiculously',
];

const INTENSITY_REDUCERS = [
  'slightly', 'somewhat', 'a bit', 'kind of', 'sort of', 'a little',
  'barely', 'hardly', 'mildly',
];

/**
 * Detect emotions in text
 */
export function detectEmotions(text: string): EmotionAnalysisResult {
  const normalizedText = text.toLowerCase();
  const detectedEmotions: DetectedEmotion[] = [];

  // Check for intensity modifiers
  const hasBoosters = INTENSITY_BOOSTERS.some(b => normalizedText.includes(b));
  const hasReducers = INTENSITY_REDUCERS.some(r => normalizedText.includes(r));
  const intensityMultiplier = hasBoosters ? 1.3 : hasReducers ? 0.7 : 1;

  // Detect each emotion type
  for (const [emotionType, config] of Object.entries(EMOTION_PATTERNS)) {
    const signals: string[] = [];
    let patternMatches = 0;
    let keywordMatches = 0;

    // Check patterns
    for (const pattern of config.patterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        patternMatches++;
        signals.push(match[0]);
      }
    }

    // Check keywords
    for (const keyword of config.keywords) {
      if (normalizedText.includes(keyword)) {
        keywordMatches++;
        signals.push(keyword);
      }
    }

    const totalMatches = patternMatches + keywordMatches;

    if (totalMatches > 0) {
      // Calculate intensity based on matches and weight
      const baseIntensity = Math.min(1, (totalMatches * 0.25) + (patternMatches * 0.15));
      const intensity = Math.min(1, baseIntensity * intensityMultiplier * config.weight);

      // Calculate confidence based on number of signals
      const confidence = Math.min(1, (totalMatches * 0.2) + 0.3);

      detectedEmotions.push({
        type: emotionType as EmotionType,
        intensity,
        confidence,
        signals: [...new Set(signals)].slice(0, 5),
      });
    }
  }

  // Sort by intensity
  detectedEmotions.sort((a, b) => b.intensity - a.intensity);

  // Determine if needs attention (high-intensity negative emotions)
  const negativeEmotions: EmotionType[] = ['frustration', 'anger', 'anxiety', 'disappointment'];
  const needsAttention = detectedEmotions.some(
    e => negativeEmotions.includes(e.type) && e.intensity >= 0.6
  );

  // Calculate overall emotional intensity
  const emotionalIntensity = detectedEmotions.length > 0
    ? detectedEmotions.reduce((sum, e) => sum + e.intensity, 0) / detectedEmotions.length
    : 0;

  return {
    primary: detectedEmotions[0] || null,
    secondary: detectedEmotions.slice(1, 3),
    allEmotions: detectedEmotions,
    emotionalIntensity,
    needsAttention,
  };
}

/**
 * Get emoji representation of emotion
 */
export function getEmotionEmoji(emotion: EmotionType): string {
  const emojis: Record<EmotionType, string> = {
    frustration: '😤',
    confusion: '😕',
    excitement: '🎉',
    disappointment: '😞',
    gratitude: '🙏',
    anxiety: '😰',
    anger: '😡',
    satisfaction: '😊',
  };
  return emojis[emotion] || '😐';
}

/**
 * Get human-readable emotion label
 */
export function getEmotionLabel(emotion: EmotionType): string {
  const labels: Record<EmotionType, string> = {
    frustration: 'Frustrated',
    confusion: 'Confused',
    excitement: 'Excited',
    disappointment: 'Disappointed',
    gratitude: 'Grateful',
    anxiety: 'Anxious/Worried',
    anger: 'Angry',
    satisfaction: 'Satisfied',
  };
  return labels[emotion] || emotion;
}

/**
 * Check if emotion is negative
 */
export function isNegativeEmotion(emotion: EmotionType): boolean {
  return ['frustration', 'anger', 'anxiety', 'disappointment'].includes(emotion);
}

/**
 * Check if emotion is positive
 */
export function isPositiveEmotion(emotion: EmotionType): boolean {
  return ['excitement', 'gratitude', 'satisfaction'].includes(emotion);
}

/**
 * Batch analyze multiple texts
 */
export function detectEmotionsBatch(texts: string[]): EmotionAnalysisResult[] {
  return texts.map(text => detectEmotions(text));
}

/**
 * Get emotion distribution from multiple results
 */
export function aggregateEmotions(results: EmotionAnalysisResult[]): {
  distribution: Record<EmotionType, number>;
  averageIntensity: number;
  attentionRate: number;
} {
  const distribution: Record<EmotionType, number> = {
    frustration: 0, confusion: 0, excitement: 0, disappointment: 0,
    gratitude: 0, anxiety: 0, anger: 0, satisfaction: 0,
  };

  let totalIntensity = 0;
  let attentionCount = 0;

  for (const result of results) {
    if (result.primary) {
      distribution[result.primary.type]++;
    }
    totalIntensity += result.emotionalIntensity;
    if (result.needsAttention) attentionCount++;
  }

  return {
    distribution,
    averageIntensity: results.length > 0 ? totalIntensity / results.length : 0,
    attentionRate: results.length > 0 ? attentionCount / results.length : 0,
  };
}
