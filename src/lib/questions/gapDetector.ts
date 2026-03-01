/**
 * Answer Gap Detector
 *
 * Analyzes answered questions for hedging language, conditional statements,
 * unresolved trade-offs, and other signals of ambiguity. When gaps are detected,
 * produces structured gap analysis that drives auto-deepening follow-up generation.
 */

// ─── Gap Types ───

export type GapType =
  | 'hedging'           // "it depends", "possibly", "maybe", "probably"
  | 'conditional'       // "if X then Y", "when ... then", "depends on"
  | 'unresolved_tradeoff' // "on one hand ... on the other", "pros and cons"
  | 'vague_reference'   // "something like", "some kind of", "etc"
  | 'deferred_decision' // "we'll figure out later", "TBD", "not sure yet"
  | 'scope_ambiguity';  // "maybe we should also", "or alternatively"

export interface DetectedGap {
  type: GapType;
  phrase: string;        // The matched phrase from the answer
  context: string;       // Surrounding sentence/text for LLM context
  confidence: number;    // 0-1, how confident we are this is a real gap
}

export interface GapAnalysis {
  questionId: string;
  answerText: string;
  gaps: DetectedGap[];
  gapScore: number;      // 0-1 aggregate ambiguity score
  shouldDeepen: boolean;  // Whether auto-deepening should trigger
  summary: string;       // Human-readable summary of detected gaps
}

// ─── Pattern Definitions ───

interface GapPattern {
  type: GapType;
  patterns: RegExp[];
  confidence: number;
}

const GAP_PATTERNS: GapPattern[] = [
  {
    type: 'hedging',
    patterns: [
      /\b(?:it depends|depends on|that depends)\b/i,
      /\b(?:possibly|probably|maybe|perhaps|might|could be)\b/i,
      /\b(?:i think|i guess|i suppose|i believe|i feel like)\b/i,
      /\b(?:not entirely sure|not 100%|hard to say|tough to say)\b/i,
      /\b(?:more or less|kind of|sort of|somewhat|fairly|relatively)\b/i,
      /\b(?:ideally|in theory|theoretically|in principle)\b/i,
    ],
    confidence: 0.7,
  },
  {
    type: 'conditional',
    patterns: [
      /\bif\s+.{5,40}\s+then\b/i,
      /\b(?:depends on whether|depending on)\b/i,
      /\b(?:assuming that|provided that|given that)\b/i,
      /\b(?:unless|except when|except if)\b/i,
      /\b(?:in case of|in the case that)\b/i,
    ],
    confidence: 0.8,
  },
  {
    type: 'unresolved_tradeoff',
    patterns: [
      /\b(?:on (?:the )?one hand|on (?:the )?other hand)\b/i,
      /\b(?:pros and cons|trade-?offs?|advantages and disadvantages)\b/i,
      /\b(?:but (?:also|then again)|however|although|on the flip side)\b/i,
      /\b(?:both .{3,30} and|either .{3,30} or)\b/i,
      /\b(?:could go either way|there are arguments for)\b/i,
    ],
    confidence: 0.85,
  },
  {
    type: 'vague_reference',
    patterns: [
      /\b(?:something like|some kind of|some sort of|some type of)\b/i,
      /\b(?:and so on|etc\.?|and stuff|and things like that)\b/i,
      /\b(?:whatever works|whatever makes sense|whatever is best)\b/i,
      /\b(?:some way to|somehow|somewhere)\b/i,
    ],
    confidence: 0.6,
  },
  {
    type: 'deferred_decision',
    patterns: [
      /\b(?:figure (?:it |that )?out later|decide later|revisit|come back to)\b/i,
      /\b(?:TBD|to be determined|to be decided|not sure yet)\b/i,
      /\b(?:we(?:'ll| will) see|let(?:'s| us) see|time will tell)\b/i,
      /\b(?:need(?:s)? more (?:info|information|research|thought|thinking))\b/i,
      /\b(?:haven't decided|undecided|open question)\b/i,
    ],
    confidence: 0.9,
  },
  {
    type: 'scope_ambiguity',
    patterns: [
      /\b(?:or alternatively|another option|another approach)\b/i,
      /\b(?:maybe we should also|we could also|might also want)\b/i,
      /\b(?:not sure if we should|unsure whether to)\b/i,
      /\b(?:scope.{0,10}(?:creep|unclear|undefined|flexible))\b/i,
    ],
    confidence: 0.75,
  },
];

// ─── Analysis Engine ───

/**
 * Extract the sentence containing the matched phrase for context
 */
function extractSentenceContext(text: string, matchIndex: number, matchLength: number): string {
  // Find sentence boundaries
  const before = text.lastIndexOf('.', matchIndex);
  const after = text.indexOf('.', matchIndex + matchLength);

  const start = before === -1 ? 0 : before + 1;
  const end = after === -1 ? text.length : after + 1;

  return text.slice(start, end).trim();
}

/**
 * Analyze an answer for gaps and ambiguity signals.
 * Returns a structured analysis with detected gaps and an aggregate score.
 */
export function analyzeAnswerGaps(questionId: string, answerText: string): GapAnalysis {
  if (!answerText || answerText.trim().length === 0) {
    return {
      questionId,
      answerText: '',
      gaps: [],
      gapScore: 0,
      shouldDeepen: false,
      summary: 'No answer text to analyze',
    };
  }

  const gaps: DetectedGap[] = [];
  const seenPhrases = new Set<string>();

  for (const pattern of GAP_PATTERNS) {
    for (const regex of pattern.patterns) {
      // Use a copy to allow multiple matches with global flag
      const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
      let match: RegExpExecArray | null;

      while ((match = globalRegex.exec(answerText)) !== null) {
        const phrase = match[0].toLowerCase().trim();

        // Deduplicate similar phrases
        if (seenPhrases.has(phrase)) continue;
        seenPhrases.add(phrase);

        const context = extractSentenceContext(answerText, match.index, match[0].length);

        gaps.push({
          type: pattern.type,
          phrase: match[0].trim(),
          context,
          confidence: pattern.confidence,
        });
      }
    }
  }

  // Calculate aggregate gap score
  const gapScore = calculateGapScore(gaps, answerText);

  // Determine if auto-deepening should trigger
  const shouldDeepen = gapScore >= 0.3 && gaps.length >= 1;

  // Build human-readable summary
  const summary = buildGapSummary(gaps, gapScore);

  return {
    questionId,
    answerText,
    gaps,
    gapScore,
    shouldDeepen,
    summary,
  };
}

/**
 * Calculate aggregate gap score (0-1) based on detected gaps.
 * Considers: number of gaps, confidence levels, diversity of gap types, answer length.
 */
function calculateGapScore(gaps: DetectedGap[], answerText: string): number {
  if (gaps.length === 0) return 0;

  // Factor 1: Average confidence of detected gaps
  const avgConfidence = gaps.reduce((sum, g) => sum + g.confidence, 0) / gaps.length;

  // Factor 2: Diversity of gap types (more types = more ambiguous)
  const uniqueTypes = new Set(gaps.map(g => g.type)).size;
  const diversityFactor = Math.min(uniqueTypes / 3, 1); // Normalize to 0-1

  // Factor 3: Gap density (gaps per 100 chars of answer)
  const density = Math.min((gaps.length / Math.max(answerText.length, 1)) * 100, 1);

  // Factor 4: High-signal gap types get extra weight
  const hasDeferred = gaps.some(g => g.type === 'deferred_decision');
  const hasTradeoff = gaps.some(g => g.type === 'unresolved_tradeoff');
  const highSignalBonus = (hasDeferred ? 0.1 : 0) + (hasTradeoff ? 0.1 : 0);

  // Weighted combination
  const raw = (avgConfidence * 0.4) + (diversityFactor * 0.25) + (density * 0.15) + (highSignalBonus * 0.2);

  return Math.min(Math.round(raw * 100) / 100, 1);
}

/**
 * Build human-readable summary of detected gaps
 */
function buildGapSummary(gaps: DetectedGap[], gapScore: number): string {
  if (gaps.length === 0) {
    return 'Answer appears clear and decisive. No ambiguity detected.';
  }

  const typeLabels: Record<GapType, string> = {
    hedging: 'hedging language',
    conditional: 'conditional statements',
    unresolved_tradeoff: 'unresolved trade-offs',
    vague_reference: 'vague references',
    deferred_decision: 'deferred decisions',
    scope_ambiguity: 'scope ambiguity',
  };

  const uniqueTypes = [...new Set(gaps.map(g => g.type))];
  const typeList = uniqueTypes.map(t => typeLabels[t]).join(', ');

  const intensity = gapScore >= 0.7 ? 'significant' : gapScore >= 0.4 ? 'moderate' : 'mild';

  return `Detected ${intensity} ambiguity (${gaps.length} signal${gaps.length !== 1 ? 's' : ''}): ${typeList}.`;
}

/**
 * Build a focused prompt addendum from gap analysis for LLM follow-up generation.
 * This gives the LLM specific instructions about what gaps to target.
 */
export function buildGapTargetingPrompt(analysis: GapAnalysis): string {
  if (analysis.gaps.length === 0) return '';

  const gapInstructions = analysis.gaps
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5) // Top 5 most confident gaps
    .map((gap, i) => {
      const typeLabel: Record<GapType, string> = {
        hedging: 'The user hedged with',
        conditional: 'The user gave a conditional answer with',
        unresolved_tradeoff: 'The user left a trade-off unresolved with',
        vague_reference: 'The user was vague about',
        deferred_decision: 'The user deferred a decision with',
        scope_ambiguity: 'The user left scope unclear with',
      };
      return `${i + 1}. ${typeLabel[gap.type]} "${gap.phrase}" — Context: "${gap.context}"`;
    })
    .join('\n');

  return `
## Detected Ambiguity Gaps (Auto-deepening)
The user's answer contains the following ambiguity signals. Generate follow-up questions that specifically target and resolve these gaps:

${gapInstructions}

Focus each follow-up question on forcing a concrete, specific decision that eliminates the detected ambiguity. Do NOT ask generic follow-ups — each question must directly address one of the gaps above.`;
}
