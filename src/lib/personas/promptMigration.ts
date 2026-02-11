/**
 * Prompt Migration Utility
 * Converts flat system_prompt text into structured prompt format.
 */

export interface StructuredPromptSection {
  title: string;
  content: string;
}

export interface StructuredPrompt {
  identity: string;
  instructions: string;
  toolGuidance: string;
  examples: string;
  errorHandling: string;
  customSections: StructuredPromptSection[];
}

/**
 * Create an empty structured prompt.
 */
export function createEmptyStructuredPrompt(): StructuredPrompt {
  return {
    identity: '',
    instructions: '',
    toolGuidance: '',
    examples: '',
    errorHandling: '',
    customSections: [],
  };
}

/**
 * Migrate a flat prompt string into the structured format.
 * Places the entire flat text into the `instructions` section.
 */
export function migratePromptToStructured(flatPrompt: string): StructuredPrompt {
  return {
    ...createEmptyStructuredPrompt(),
    instructions: flatPrompt,
  };
}

/**
 * Check if all sections of a structured prompt are empty.
 */
export function isStructuredPromptEmpty(sp: StructuredPrompt): boolean {
  return (
    !sp.identity.trim() &&
    !sp.instructions.trim() &&
    !sp.toolGuidance.trim() &&
    !sp.examples.trim() &&
    !sp.errorHandling.trim() &&
    sp.customSections.every(s => !s.content.trim())
  );
}

/**
 * Parse a JSON string into a StructuredPrompt, returning null on failure.
 */
export function parseStructuredPrompt(json: string | null): StructuredPrompt | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.instructions === 'string') {
      return parsed as StructuredPrompt;
    }
    return null;
  } catch {
    return null;
  }
}
