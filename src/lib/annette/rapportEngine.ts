/**
 * Rapport Engine
 * Analyzes conversation patterns and updates the developer rapport model.
 * Influences Annette's personality axes: tone, depth, initiative, humor.
 *
 * Runs after each conversation turn to learn communication style,
 * detect frustration, and adapt personality over time.
 */

import { annetteDb } from '@/app/db';
import type { DbAnnetteRapport } from '@/app/db/models/annette.types';
import { logger } from '@/lib/logger';

// ─── Signal Detection Types ───

interface ConversationSignals {
  avgMessageLength: number;
  questionFrequency: number;     // ratio of messages containing '?'
  emojiUsage: boolean;
  casualLanguage: boolean;       // slang, contractions, lowercase starts
  technicalDepth: number;        // 0-1 based on jargon density
  frustrationIndicators: number; // count of frustration signals
  humorIndicators: number;       // count of humor signals (lol, haha, etc.)
  repeatedQuestions: boolean;    // same question asked multiple times
  shortBursts: boolean;          // multiple very short messages in sequence
  errorMentions: number;         // references to errors, bugs, issues
}

// ─── Constants ───

const LEARNING_RATE = 0.08;         // How fast axes shift per turn
const FRUSTRATION_DECAY = 0.85;     // Frustration decays between sessions
const MIN_MESSAGES_FOR_ANALYSIS = 2;
const SHORT_MESSAGE_THRESHOLD = 30; // chars
const SHORT_BURST_COUNT = 3;        // consecutive short messages = burst

// ─── Main Analysis Function ───

/**
 * Analyze a conversation turn and update the rapport model.
 * Call this after each completed orchestration turn.
 */
export function analyzeAndUpdateRapport(
  projectId: string,
  userMessages: string[],
  assistantMessages: string[],
  toolsUsed: Array<{ name: string }>
): void {
  try {
    if (userMessages.length < MIN_MESSAGES_FOR_ANALYSIS) return;

    const rapport = annetteDb.rapport.getOrCreate(projectId);
    const signals = detectSignals(userMessages);
    const updates = computeAxisUpdates(rapport, signals, toolsUsed);

    annetteDb.rapport.update(projectId, updates);
    annetteDb.rapport.incrementTurns(projectId);

    logger.debug('[Rapport] Updated rapport model', {
      projectId,
      mood: updates.detected_mood,
      frustration: updates.frustration_score,
      tone: updates.tone_formal_casual,
    });
  } catch (error) {
    logger.error('[Rapport] Failed to update rapport', { projectId, error });
  }
}

// ─── Signal Detection ───

function detectSignals(userMessages: string[]): ConversationSignals {
  const totalLength = userMessages.reduce((sum, m) => sum + m.length, 0);
  const avgMessageLength = totalLength / userMessages.length;

  const questionsCount = userMessages.filter(m => m.includes('?')).length;
  const questionFrequency = questionsCount / userMessages.length;

  const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const emojiUsage = userMessages.some(m => emojiPattern.test(m));

  const casualPatterns = /\b(gonna|wanna|gotta|idk|tbh|imo|lmk|nvm|btw|fyi|asap|ty|thx|pls|plz|ya|yep|nope|yea|yeah|nah|ok|okay|cool|dude|bro|man|hey|haha|lol|lmao|omg)\b/i;
  const casualLanguage = userMessages.some(m => casualPatterns.test(m));

  const techPatterns = /\b(api|sdk|orm|sql|nosql|graphql|restful|middleware|webhook|oauth|jwt|cors|cdn|ci\/cd|kubernetes|docker|microservice|monorepo|typescript|webpack|vite|eslint|prisma|drizzle|zod|trpc|ssr|csr|hydration|memoization|debounce|throttle|async|await|promise|callback|middleware|interceptor|polymorphism|abstraction|encapsulation|singleton|observer|pub.?sub|event.?driven|reactive|declarative|imperative)\b/i;
  const techMessages = userMessages.filter(m => techPatterns.test(m)).length;
  const technicalDepth = Math.min(1, techMessages / Math.max(1, userMessages.length));

  // Frustration signals
  let frustrationIndicators = 0;
  const frustrationPatterns = /\b(doesn't work|not working|broken|wtf|ugh|again|still|why is|can't|cannot|impossible|hate|annoying|frustrated|confused|stuck|help me|please help|what the)\b/i;
  for (const msg of userMessages) {
    if (frustrationPatterns.test(msg)) frustrationIndicators++;
    // Very short messages with punctuation (e.g., "no.", "why?", "...") can indicate frustration
    if (msg.length < 15 && /^[.!?]{2,}|\.{3,}$/.test(msg.trim())) frustrationIndicators++;
  }

  // Humor signals
  const humorPatterns = /\b(haha|lol|lmao|rofl|😂|🤣|funny|joke|kidding|jk)\b/i;
  const humorIndicators = userMessages.filter(m => humorPatterns.test(m)).length;

  // Repeated questions
  const normalized = userMessages.map(m => m.toLowerCase().replace(/[^\w\s]/g, '').trim());
  const repeatedQuestions = new Set(normalized).size < normalized.length;

  // Short bursts
  let consecutiveShort = 0;
  let shortBursts = false;
  for (const msg of userMessages) {
    if (msg.length < SHORT_MESSAGE_THRESHOLD) {
      consecutiveShort++;
      if (consecutiveShort >= SHORT_BURST_COUNT) shortBursts = true;
    } else {
      consecutiveShort = 0;
    }
  }

  // Error mentions
  const errorPatterns = /\b(error|bug|issue|crash|fail|exception|stack trace|undefined|null|NaN|404|500|timeout|ENOENT|ECONNREFUSED|segfault|panic)\b/i;
  const errorMentions = userMessages.filter(m => errorPatterns.test(m)).length;

  return {
    avgMessageLength,
    questionFrequency,
    emojiUsage,
    casualLanguage,
    technicalDepth,
    frustrationIndicators,
    humorIndicators,
    repeatedQuestions,
    shortBursts,
    errorMentions,
  };
}

// ─── Axis Computation ───

function computeAxisUpdates(
  current: DbAnnetteRapport,
  signals: ConversationSignals,
  toolsUsed: Array<{ name: string }>
): Partial<DbAnnetteRapport> {
  // Tone: formal ← 0.0 ... 1.0 → casual
  let toneDelta = 0;
  if (signals.casualLanguage || signals.emojiUsage) toneDelta += 0.15;
  if (signals.avgMessageLength > 200) toneDelta -= 0.1; // longer = more formal
  if (signals.avgMessageLength < 50) toneDelta += 0.05;
  const tone = clampAxis(current.tone_formal_casual + toneDelta * LEARNING_RATE);

  // Depth: expert ← 0.0 ... 1.0 → teaching
  let depthDelta = 0;
  if (signals.technicalDepth > 0.5) depthDelta -= 0.15;  // expert user
  if (signals.questionFrequency > 0.5) depthDelta += 0.1; // lots of questions = needs teaching
  if (signals.errorMentions > 0 && signals.frustrationIndicators > 0) depthDelta += 0.1;
  const depth = clampAxis(current.depth_expert_teaching + depthDelta * LEARNING_RATE);

  // Initiative: reactive ← 0.0 ... 1.0 → proactive
  let initiativeDelta = 0;
  if (signals.shortBursts) initiativeDelta += 0.1; // short bursts = user wants help
  if (toolsUsed.length > 3) initiativeDelta += 0.05; // heavy tool use = user expects action
  if (signals.avgMessageLength > 300) initiativeDelta -= 0.1; // detailed instructions = reactive ok
  const initiative = clampAxis(current.initiative_reactive_proactive + initiativeDelta * LEARNING_RATE);

  // Humor: professional ← 0.0 ... 1.0 → playful
  let humorDelta = 0;
  if (signals.humorIndicators > 0) humorDelta += 0.2;
  if (signals.casualLanguage) humorDelta += 0.05;
  if (signals.frustrationIndicators > 1) humorDelta -= 0.15; // not the time for jokes
  const humor = clampAxis(current.humor_level + humorDelta * LEARNING_RATE);

  // Frustration score
  const rawFrustration =
    (signals.frustrationIndicators * 0.25) +
    (signals.repeatedQuestions ? 0.2 : 0) +
    (signals.shortBursts ? 0.15 : 0) +
    (signals.errorMentions > 2 ? 0.2 : signals.errorMentions > 0 ? 0.1 : 0);
  // Blend with existing (decay old, add new)
  const frustration = clampAxis(
    current.frustration_score * FRUSTRATION_DECAY + rawFrustration * (1 - FRUSTRATION_DECAY)
  );

  // Mood detection
  const mood = detectMood(signals, frustration);

  // Update emotional history (keep last 20 entries)
  let emotionalHistory: Array<{ mood: string; frustration: number; ts: string }> = [];
  try {
    emotionalHistory = JSON.parse(current.emotional_history || '[]');
  } catch { /* empty */ }
  emotionalHistory.push({
    mood,
    frustration: Math.round(frustration * 100) / 100,
    ts: new Date().toISOString(),
  });
  if (emotionalHistory.length > 20) {
    emotionalHistory = emotionalHistory.slice(-20);
  }

  // Update communication signals
  let commSignals: Record<string, unknown> = {};
  try {
    commSignals = JSON.parse(current.communication_signals || '{}');
  } catch { /* empty */ }
  commSignals.avg_message_length = Math.round(signals.avgMessageLength);
  commSignals.uses_emoji = signals.emojiUsage;
  commSignals.uses_casual_language = signals.casualLanguage;
  commSignals.question_frequency = Math.round(signals.questionFrequency * 100) / 100;
  commSignals.technical_depth = Math.round(signals.technicalDepth * 100) / 100;
  commSignals.last_analyzed = new Date().toISOString();

  return {
    tone_formal_casual: round3(tone),
    depth_expert_teaching: round3(depth),
    initiative_reactive_proactive: round3(initiative),
    humor_level: round3(humor),
    detected_mood: mood,
    frustration_score: round3(frustration),
    emotional_history: JSON.stringify(emotionalHistory),
    communication_signals: JSON.stringify(commSignals),
  };
}

function detectMood(
  signals: ConversationSignals,
  frustration: number
): DbAnnetteRapport['detected_mood'] {
  if (frustration > 0.6 || signals.frustrationIndicators > 2) return 'frustrated';
  if (signals.shortBursts && signals.avgMessageLength < 40) return 'rushed';
  if (signals.questionFrequency > 0.6) return 'exploratory';
  if (signals.technicalDepth > 0.4 && signals.avgMessageLength > 100) return 'focused';
  return 'neutral';
}

// ─── Prompt Injection ───

/**
 * Build a personality context string to inject into the system prompt.
 * Translates the rapport axes into behavioral instructions for the LLM.
 */
export function buildRapportPromptContext(projectId: string): string {
  try {
    const rapport = annetteDb.rapport.getOrCreate(projectId);

    // Don't inject personality until we have enough data
    if (rapport.total_turns_analyzed < 3) return '';

    const sections: string[] = [];

    // Tone instruction
    if (rapport.tone_formal_casual > 0.65) {
      sections.push('Use a casual, friendly tone. Contractions and informal language are welcome.');
    } else if (rapport.tone_formal_casual < 0.35) {
      sections.push('Maintain a professional, precise tone. Avoid slang or overly casual language.');
    }

    // Depth instruction
    if (rapport.depth_expert_teaching > 0.65) {
      sections.push('This developer appreciates detailed explanations. Explain reasoning and include context when making suggestions.');
    } else if (rapport.depth_expert_teaching < 0.35) {
      sections.push('This is an experienced developer. Be concise and skip basic explanations. Focus on the actionable specifics.');
    }

    // Initiative instruction
    if (rapport.initiative_reactive_proactive > 0.65) {
      sections.push('Be proactive: suggest next steps, flag potential issues, and offer to take on tasks before being asked.');
    } else if (rapport.initiative_reactive_proactive < 0.35) {
      sections.push('Wait for explicit requests. Answer what is asked without volunteering unsolicited suggestions.');
    }

    // Humor instruction
    if (rapport.humor_level > 0.5) {
      sections.push('Light humor is appreciated. Keep it natural and relevant.');
    } else if (rapport.humor_level < 0.15) {
      sections.push('Keep responses straightforward and professional. Avoid humor.');
    }

    // Frustration response
    if (rapport.detected_mood === 'frustrated' || rapport.frustration_score > 0.5) {
      sections.push(
        'The developer seems frustrated. Be extra supportive, acknowledge difficulty, offer to take over tasks, ' +
        'and provide clear step-by-step guidance. Avoid being overly cheery.'
      );
    } else if (rapport.detected_mood === 'rushed') {
      sections.push('The developer is working quickly. Keep responses ultra-concise. No preamble, just answers.');
    } else if (rapport.detected_mood === 'exploratory') {
      sections.push('The developer is exploring and brainstorming. Encourage ideas and offer alternatives.');
    }

    // Expertise areas
    try {
      const expertise = JSON.parse(rapport.expertise_areas || '[]') as string[];
      if (expertise.length > 0) {
        sections.push(`Developer expertise areas: ${expertise.join(', ')}. Calibrate technical depth accordingly.`);
      }
    } catch { /* empty */ }

    if (sections.length === 0) return '';

    return `## Developer Rapport (Personality Adaptation)\n${sections.join('\n')}`;
  } catch (error) {
    logger.error('[Rapport] Failed to build prompt context', { projectId, error });
    return '';
  }
}

/**
 * Get the raw rapport data for API/UI consumption
 */
export function getRapportData(projectId: string): DbAnnetteRapport {
  return annetteDb.rapport.getOrCreate(projectId);
}

// ─── Utilities ───

function clampAxis(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
