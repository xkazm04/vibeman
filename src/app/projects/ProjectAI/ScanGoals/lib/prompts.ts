/**
 * LLM prompts for goals generation
 * Separated from the main generation logic for better maintainability
 */

/**
 * Default fallback prompt template if project-goals.md template is not found
 */
export const DEFAULT_GOALS_PROMPT = `Based on the repository analysis above, generate exactly 3 high-level strategic directions that would transform this application into a high-quality, market-competitive product. Focus on user-centric value creation and market differentiation rather than just technical improvements.

**CRITICAL: Avoid duplicating any existing goals that have already been generated for this project.**

Return the directions in strict JSON format following this schema:

\`\`\`json
[
  {
    "title": "string (2-5 words)",
    "description": [
      "Strategic initiative or capability to develop",
      "Key implementation milestone",
      "Additional strategic steps as needed"
    ],
    "type": "Business|Technical",
    "reason": "string (1-2 sentences explaining the market opportunity or competitive advantage)"
  }
]
\`\`\`

Selection criteria for strategic directions:
- Business Impact: Prioritize initiatives that could significantly expand user base, revenue potential, or market position
- User Value: Focus on transformative features that solve real user problems or create new opportunities
- Differentiation: Consider what would make this product stand out from competitors
- Scalability: Choose directions that enable growth and expansion
- Monetization: Include at least one direction that could improve revenue generation

Each direction should be:
- Ambitious but achievable within 3-6 months
- Aligned with modern market expectations and trends
- Focused on outcomes rather than just outputs
- Clear enough to guide multiple feature developments

Ensure the JSON is valid and parseable. Mark as "Business" if primarily about user experience, market positioning, or revenue. Mark as "Technical" if about platform capabilities, performance, or infrastructure that enables business goals.`;

/**
 * Build final prompt with context sections
 */
export function buildGoalsPrompt(
  baseTemplate: string,
  aiDocsSection: string,
  analysisSection: string,
  existingGoalsSection: string,
  hasAIDocs: boolean
): string {
  return `You are an expert product strategist and business analyst. ${baseTemplate}

---

${aiDocsSection}

${analysisSection}

${existingGoalsSection}

---

Please analyze this project data and generate exactly 3 NEW strategic directions that DO NOT duplicate any existing goals listed above. Focus on transformative business opportunities and competitive advantages that complement the existing strategic work.

${hasAIDocs ? 'IMPORTANT: Pay special attention to the AI-generated documentation above, which provides comprehensive insights into the application\'s current state, improvement opportunities, and technical assessment. Use these insights to create strategic goals that address the most impactful opportunities identified in the analysis.' : ''}`;
}
