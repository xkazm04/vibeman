import { parseAIJsonResponse } from '@/lib/aiJsonParser';
import { logger } from '@/lib/logger';
import type { GeneratedIdea } from '../generateIdeas';

/**
 * Parse and validate the LLM response into an array of GeneratedIdea objects.
 * Throws on parse failure or if the result is not an array.
 */
export function parseAndValidateIdeas(rawResponse: string): GeneratedIdea[] {
  try {
    const parseResult = parseAIJsonResponse(rawResponse);

    // Validate that we got an array
    if (!Array.isArray(parseResult)) {
      logger.error('Parsed result is not an array', { type: typeof parseResult });
      throw new Error('Expected JSON array, got ' + typeof parseResult);
    }
    const parsedIdeas = parseResult as GeneratedIdea[];

    logger.info('Successfully parsed ideas', { count: parsedIdeas.length });

    // Log validation summary
    const validIdeas = parsedIdeas.filter(idea =>
      idea.title && typeof idea.title === 'string' && idea.title.trim() !== ''
    );
    const invalidIdeas = parsedIdeas.length - validIdeas.length;
    if (invalidIdeas > 0) {
      logger.warn('Ideas will be skipped due to missing required fields', { count: invalidIdeas });
    }

    return parsedIdeas;
  } catch (parseError) {
    logger.error('Failed to parse LLM response', { error: parseError, rawResponse });
    throw new Error('Failed to parse LLM response as JSON: ' + (parseError instanceof Error ? parseError.message : 'Unknown error'));
  }
}
