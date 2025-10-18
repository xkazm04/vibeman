/**
 * LangGraph Constants
 * Available  configuration for the LangGraph pipeline
 */

import { LLMProvider } from './langTypes';

export const LANGGRAPH_CONFIG = {
  // Model defaults per provider
  defaultModels: {
    ollama: 'gpt-oss:20b',
    openai: 'gpt-4o',
    anthropic: 'claude-sonnet-4-20250514',
    gemini: 'gemini-flash-latest'
  } as Record<LLMProvider, string>,
  
  // Confidence thresholds
  lowConfidenceThreshold: 60,
  needsConfirmationThreshold: 70,
  
  // Timeout settings
  toolExecutionTimeout: 30000, // 30 seconds
  llmGenerationTimeout: 60000, // 60 seconds
};

export const KNOWLEDGE_BASE_ENFORCEMENT_RULES = {
  // Rules to enforce knowledge base usage
  requireProjectContext: true,
  rejectGeneralKnowledge: true,
  requireToolUsageForQuestions: true,
  
  // Error messages
  noProjectContextMessage: 'I need project context to answer your question accurately.',
  generalKnowledgeWarning: 'I can only answer questions based on your project knowledge base.',
  toolRequiredMessage: 'This question requires accessing the project knowledge base.',
};
