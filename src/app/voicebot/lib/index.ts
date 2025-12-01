/**
 * Voicebot Module Library - Barrel Exports
 * Centralized exports for all lib utilities, types, and API operations
 */

// Type Definitions - from shared voice library
export * from '@/lib/voice/voicebotTypes';

// Utility Functions - from shared voice library
export * from '@/lib/voice/voicebotUtils';

// API Operations - still in Annette feature (specific to Annette voice assistant)
export * from '../../features/Annette/lib/voicebotApi';

// Conversation Evaluation - voicebot-specific feature
export * from './conversationEvaluation';

// Re-export CONVERSATION_TEST_SENTENCES from Annette for compatibility
export { CONVERSATION_TEST_SENTENCES } from '../../features/Annette/lib/voicebotTypes';
