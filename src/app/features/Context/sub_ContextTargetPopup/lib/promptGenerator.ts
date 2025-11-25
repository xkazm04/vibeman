/**
 * Context Target Analysis Prompt Generator
 *
 * Generates comprehensive prompts for AI analysis of software contexts,
 * focusing on business value, user productivity, and strategic evolution.
 */

import { Context } from '@/stores/context/contextStoreTypes';

/**
 * Generate a comprehensive business-focused analysis prompt for a context
 *
 * This prompt instructs the AI to analyze the context from multiple angles:
 * - Strategic business value and competitive advantage
 * - User productivity gains and workflow improvements
 * - Technical maturity and implementation completeness
 * - Future evolution path and feature roadmap
 *
 * @param context - The context to analyze
 * @returns Formatted prompt for AI analysis
 */
export function generateContextAnalysisPrompt(context: Context): string {
  // Build context details section
  const contextDetails = buildContextDetails(context);

  // Build analysis instructions
  const instructions = buildAnalysisInstructions();

  // Build response format
  const responseFormat = buildResponseFormat();

  return `${contextDetails}

${instructions}

${responseFormat}`;
}

/**
 * Build detailed context information section
 */
function buildContextDetails(context: Context): string {
  const filePaths = Array.isArray(context.filePaths)
    ? context.filePaths.join(', ')
    : 'No files';

  const description = context.description || 'No description available';

  const preview = context.preview
    ? `\n- Visual Preview: Available (${context.preview})`
    : '';

  return `Analyze this software feature/context from a business and user value perspective.

Context Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature Name: ${context.name}

Description: ${description}

Technical Details:
- Implementation Files: ${filePaths}
- Has Dedicated Context File: ${context.hasContextFile ? 'Yes' : 'No'}${preview}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Build comprehensive analysis instructions
 */
function buildAnalysisInstructions(): string {
  return `Your Mission:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Analyze this feature/context with a focus on MAXIMIZING USER VALUE and PRODUCTIVITY.

Part 1: STRATEGIC VISION (Target State)
Describe where this feature should evolve to create maximum impact:

Consider these dimensions:
✦ Business Value
  - What unique competitive advantage does this feature provide?
  - How does it differentiate the product in the market?
  - What revenue/growth opportunities does it unlock?

✦ User Productivity
  - How will this feature save users time or effort?
  - What frustrations or pain points does it eliminate?
  - What new workflows or capabilities does it enable?
  - How much productivity gain can users expect? (e.g., "2x faster", "eliminates 30 min/day")

✦ Strategic Ambition
  - What's the most ambitious, valuable version of this feature?
  - What adjacent problems could it solve with enhancement?
  - How could it create a "must-have" experience?

✦ Future Evolution
  - What intelligent automation could be added?
  - What integrations would multiply its value?
  - How could AI/ML enhance its capabilities?

Part 2: CURRENT STATE (Fulfillment Assessment)
Evaluate the current implementation honestly and constructively:

Assess these aspects:
✦ Implementation Maturity
  - What percentage of the target vision is implemented? (rough estimate)
  - What core capabilities are working well?
  - What's still missing or incomplete?

✦ User Experience Quality
  - Is the current UX intuitive and delightful?
  - Are there usability gaps or rough edges?
  - How does it compare to user expectations?

✦ Technical Foundation
  - Is the code architecture solid and maintainable?
  - Are there technical debt or scalability concerns?
  - What refactoring or improvements are needed?

✦ Immediate Opportunities
  - What quick wins could boost value in the next sprint?
  - What's blocking this feature from reaching the next level?
  - What should be prioritized first?

IMPORTANT: Be ambitious yet realistic. Focus on tangible user benefits, not just technical features.
Use concrete examples and quantifiable impacts where possible (e.g., "reduce task time by 50%").`;
}

/**
 * Build structured response format specification
 */
function buildResponseFormat(): string {
  return `Response Format:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return your analysis as a JSON object with exactly these two fields:

{
  "target": "3-5 sentences describing the strategic vision, ambitious goals, and user productivity gains. Focus on WHAT VALUE this feature should deliver and WHY it matters to users. Include quantifiable benefits where possible.",

  "fulfillment": "3-5 sentences honestly assessing current progress toward the target. Describe WHAT'S IMPLEMENTED, what's working well, what's missing, and the most important next steps. Be constructive and specific about gaps."
}

CRITICAL:
- Return ONLY valid JSON, no markdown formatting, no code blocks, no explanations
- Focus on USER VALUE and PRODUCTIVITY in every statement
- Be specific and actionable
- Use energizing, forward-looking language for target
- Use honest, constructive language for fulfillment`;
}

/**
 * Validate that a context has sufficient information for analysis
 */
export function validateContextForAnalysis(context: Context): { valid: boolean; error?: string } {
  if (!context.name || context.name.trim().length === 0) {
    return { valid: false, error: 'Context must have a name' };
  }

  if (!Array.isArray(context.filePaths) || context.filePaths.length === 0) {
    return { valid: false, error: 'Context must have at least one file' };
  }

  return { valid: true };
}
