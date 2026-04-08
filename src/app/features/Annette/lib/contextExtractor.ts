/**
 * Context Extractor
 *
 * Extracts context signals (topics, entities, questions, intents) from messages
 * using LLM analysis. Used by the contextual recaller for memory retrieval.
 */

import { generateWithLLM } from '@/lib/llm';
import { safeParseLLMJson } from '@/lib/safeParseLLMJson';
import type { ConversationContext } from './contextualRecaller';

/**
 * Extract context signals from a message using LLM analysis
 */
export async function extractContextSignals(message: string): Promise<ConversationContext> {
  const prompt = `Analyze this message and extract context signals for memory retrieval.

Message: ${message}

Extract:
1. Topics: Main topics being discussed
2. Entities: Named entities (files, functions, components, technologies, etc.)
3. Questions: Questions being asked (if any)
4. Intents: User intents (asking, explaining, debugging, planning, etc.)

Respond in JSON format:
{
  "topics": ["topic1", "topic2"],
  "entities": ["entity1", "entity2"],
  "questions": ["question1"],
  "intents": ["intent1", "intent2"]
}`;

  try {
    const response = await generateWithLLM(prompt, {
      provider: 'anthropic',
      temperature: 0.2,
      maxTokens: 500,
    });

    if (!response.success || !response.response) {
      return { topics: [], entities: [], questions: [], intents: [] };
    }

    const parsed = safeParseLLMJson<ConversationContext>(response.response);
    return {
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      intents: Array.isArray(parsed.intents) ? parsed.intents : [],
    };
  } catch (error) {
    console.error('Failed to extract context signals:', error);
    return { topics: [], entities: [], questions: [], intents: [] };
  }
}
