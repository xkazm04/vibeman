/**
 * Shared helpers for building consistent prompt templates
 * Extracted to reduce duplication across prompt files
 */

/**
 * Build the mission section header
 */
export function buildMissionHeader(
  agentName: string,
  projectName: string,
  hasContext: boolean
): string {
  return `You are a ${agentName} analyzing ${hasContext ? 'a specific context within' : ''} the "${projectName}" project.`;
}

/**
 * Build the standard quality requirements section
 */
export function buildQualityRequirements(requirements: string[]): string {
  let section = `### Quality Requirements:\n`;
  requirements.forEach((req, index) => {
    section += `${index + 1}. ${req}\n`;
  });
  return section;
}

/**
 * Build the analysis process section
 */
export function buildAnalysisProcess(steps: string[]): string {
  let section = `## Your Analysis Process\n\n`;
  steps.forEach((step, index) => {
    section += `${index + 1}. ${step}\n`;
  });
  return section;
}

/**
 * Build the critical instructions section
 */
export function buildCriticalInstructions(dos: string[], donts: string[]): string {
  let section = `### Critical Instructions:\n\n`;

  if (dos.length > 0) {
    section += `✅ **DO**:\n`;
    dos.forEach(item => {
      section += `- ${item}\n`;
    });
    section += '\n';
  }

  if (donts.length > 0) {
    section += `❌ **DON'T**:\n`;
    donts.forEach(item => {
      section += `- ${item}\n`;
    });
    section += '\n';
  }

  return section;
}

/**
 * Build the expected output section
 */
export function buildExpectedOutput(description: string, points: string[]): string {
  let section = `### Expected Output:\n\n${description}\n`;
  points.forEach((point, index) => {
    section += `${index + 1}. ${point}\n`;
  });
  return section;
}

/**
 * Build the context-specific focus section
 */
export function buildContextFocus(hasContext: boolean, focusPoints: string[]): string {
  if (!hasContext || focusPoints.length === 0) {
    return '';
  }

  let section = `**Context-Specific Focus**:\n`;
  section += `Analyze this context for opportunities:\n`;
  focusPoints.forEach(point => {
    section += `- ${point}\n`;
  });

  return section;
}

/**
 * Build a focus area section with emoji and items
 */
export function buildFocusArea(
  emoji: string,
  title: string,
  category: string,
  items: string[]
): string {
  let section = `### ${emoji} ${title} (${category})\n`;
  items.forEach(item => {
    section += `- ${item}\n`;
  });
  section += '\n';
  return section;
}

/**
 * Build content sections (AI docs, context, existing ideas, code)
 */
export function buildContentSections(
  aiDocsSection: string,
  contextSection: string,
  existingIdeasSection: string,
  codeSection: string
): string {
  return `---

${aiDocsSection}

${contextSection}

${existingIdeasSection}

${codeSection}

---

`;
}
