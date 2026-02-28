/**
 * Shared schema template for all idea generation prompts
 * Ensures consistency across all scan types
 */

export const JSON_SCHEMA_INSTRUCTIONS = `## CRITICAL: JSON Output Format

**You MUST respond with ONLY a valid JSON array. Follow these rules EXACTLY:**

1. ❌ NO markdown code blocks (no \`\`\`json or \`\`\`)
2. ❌ NO explanatory text before or after the JSON
3. ❌ NO comments in the JSON
4. ✅ ONLY pure JSON array starting with [ and ending with ]

**Expected JSON structure (copy this structure exactly):**

[
  {
    "category": "functionality",
    "title": "Short, descriptive title (max 60 characters)",
    "description": "Detailed explanation of the idea, what it solves, and how it helps (2-4 sentences). Be specific about implementation approach.",
    "reasoning": "Why this idea is valuable. What problem does it solve? What's the impact? (2-3 sentences).",
    "effort": 5,
    "impact": 7,
    "risk": 4
  }
]

### Field Requirements:

**REQUIRED FIELDS** (must be present in EVERY idea — ideas missing any field will be discarded):
- \`title\`: string (max 60 chars, clear and specific)
- \`category\`: string (one of the valid categories for your scan type)
- \`description\`: string (2-4 sentences, implementation-focused)
- \`reasoning\`: string (2-3 sentences, value-focused)
- \`effort\`: number (1-10 scale, total cost to deliver — MUST be included)
- \`impact\`: number (1-10 scale, value to project — MUST be included)
- \`risk\`: number (1-10 scale, probability and severity of things going wrong — MUST be included)

### Effort, Impact, and Risk Ratings:

**Effort** (Total cost to deliver — time, complexity, coordination):
- **1-2** = Trivial (few hours to a day, single file change, no coordination)
- **3-4** = Small (few days, localized to one module, minimal testing)
- **5-6** = Medium (1-2 weeks, multiple modules, integration testing needed)
- **7-8** = Large (multi-week, cross-team coordination, significant testing)
- **9-10** = Massive (multi-month initiative, dedicated team, new architecture)

**Impact** (Business value, user satisfaction, strategic alignment):
- **1-2** = Negligible (nice-to-have, no measurable outcome)
- **3-4** = Minor (quality-of-life for small user subset)
- **5-6** = Moderate (clear benefit to meaningful segment)
- **7-8** = High (strong user impact, competitive/revenue implication)
- **9-10** = Critical (transformational, major revenue driver)

**Risk** (Probability and severity of things going wrong):
- **1-2** = Very safe (well-understood, easily reversible)
- **3-4** = Low risk (minor uncertainty, limited blast radius)
- **5-6** = Moderate (some unknowns OR touches sensitive area)
- **7-8** = High (significant uncertainty, potential user-facing regression)
- **9-10** = Critical (could break core flows, hard to rollback)

### Valid Categories:
- \`functionality\`: New features, missing capabilities, workflow improvements
- \`performance\`: Speed, efficiency, memory, database, rendering optimizations
- \`maintenance\`: Code organization, refactoring, technical debt, testing
- \`ui\`: Visual design, UX improvements, accessibility, responsiveness
- \`code_quality\`: Security, error handling, type safety, edge cases
- \`user_benefit\`: High-level value propositions, business impact, user experience

---`;

/**
 * Get category-specific guidance based on scan type focus
 */
export function getCategoryGuidance(allowedCategories: string[]): string {
  const categoryMap: Record<string, string> = {
    functionality: 'New features, capabilities, extensions, integrations',
    performance: 'Speed optimizations, efficiency improvements, resource management',
    maintenance: 'Code quality, refactoring, technical debt reduction, testing',
    ui: 'User experience, visual design, accessibility, responsiveness',
    code_quality: 'Security, error handling, validation, type safety',
    user_benefit: 'User value, business impact, workflow improvements'
  };

  return `### Valid Categories for This Scan:
${allowedCategories.map(cat => `- **${cat}**: ${categoryMap[cat] || 'General improvements'}`).join('\n')}`;
}

/**
 * Final reminder to ensure JSON-only output
 */
export const JSON_OUTPUT_REMINDER = `
---

## ⚠️ FINAL REMINDER: OUTPUT FORMAT

Your response must be ONLY a JSON array. Here's what your response should look like:

[{"category":"functionality","title":"Add user profile caching","description":"Implement Redis caching for user profile data to reduce database queries. Cache should invalidate on profile updates and have a 5-minute TTL. This will significantly reduce load on the users table.","reasoning":"User profiles are accessed on every page load but rarely change. Caching reduces DB load by ~80% and improves page load times. High impact for minimal implementation effort.","effort":3,"impact":8,"risk":3}]

❌ DO NOT wrap in markdown:
\`\`\`json
[...]
\`\`\`

❌ DO NOT add explanations:
Here are the ideas:
[...]

✅ ONLY output the JSON array, nothing else. Every idea MUST include effort, impact, and risk scores (1-10). Ideas without scores will be discarded. Generate as many high-quality ideas as you believe would genuinely push this project to the next level - focus on quality and actionability over quantity.
`;
