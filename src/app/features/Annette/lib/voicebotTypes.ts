/**
 * Voicebot Module Type Definitions
 *
 * Re-exports from shared voice library for backward compatibility.
 * New code should import directly from '@/lib/voice'.
 *
 * @deprecated Import from '@/lib/voice' instead
 */

// Re-export all types from shared library
export * from '@/lib/voice/voicebotTypes';

// Import test sentences from voicebot feature (not moved to shared lib)
import { EVALUATION_TEST_SENTENCES } from '../../../voicebot/lib/conversationEvaluation';

/**
 * Conversation test sentences (imported from evaluation constants)
 * Can be customized in conversationEvaluation.ts
 */
export const CONVERSATION_TEST_SENTENCES = EVALUATION_TEST_SENTENCES;
