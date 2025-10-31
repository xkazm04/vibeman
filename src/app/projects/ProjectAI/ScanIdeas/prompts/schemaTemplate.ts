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
    "effort": 2,
    "impact": 3
  }
]

### Field Requirements:

**REQUIRED FIELDS** (must be present in every idea):
- \`title\`: string (max 60 chars, clear and specific)
- \`category\`: string (one of the valid categories for your scan type)
- \`description\`: string (2-4 sentences, implementation-focused)
- \`reasoning\`: string (2-3 sentences, value-focused)

**STRONGLY RECOMMENDED FIELDS** (should always be included):
- \`effort\`: number (1, 2, or 3 - implementation difficulty)
- \`impact\`: number (1, 2, or 3 - value to project)

### Effort and Impact Ratings:

**Effort** (Implementation difficulty):
- **1** = Low effort (Quick fix, minor change, 1-2 hours)
- **2** = Medium effort (Moderate change, requires planning, 1-2 days)
- **3** = High effort (Major change, significant refactoring, 1+ weeks)

**Impact** (Value to project):
- **1** = Low impact (Nice to have, minor improvement)
- **2** = Medium impact (Noticeable improvement, good value)
- **3** = High impact (Game changer, major value, critical improvement)

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

[{"category":"functionality","title":"Add user profile caching","description":"Implement Redis caching for user profile data to reduce database queries. Cache should invalidate on profile updates and have a 5-minute TTL. This will significantly reduce load on the users table.","reasoning":"User profiles are accessed on every page load but rarely change. Caching reduces DB load by ~80% and improves page load times. High impact for minimal implementation effort.","effort":1,"impact":3}]

❌ DO NOT wrap in markdown:
\`\`\`json
[...]
\`\`\`

❌ DO NOT add explanations:
Here are the ideas:
[...]

✅ ONLY output the JSON array, nothing else.
`;
