/**
 * Comprehensive Multi-Dimensional Analysis Prompt
 * Combines all perspectives for holistic code review
 */

interface PromptOptions {
  projectName: string;
  aiDocsSection: string;
  contextSection: string;
  existingIdeasSection: string;
  codeSection: string;
  hasContext: boolean;
}

export function buildOverallPrompt(options: PromptOptions): string {
  const {
    projectName,
    aiDocsSection,
    contextSection,
    existingIdeasSection,
    codeSection,
    hasContext
  } = options;

  return `You are an expert software analyst performing a comprehensive, multi-dimensional analysis of ${hasContext ? 'a specific context within' : ''} the "${projectName}" project.

Your mission: Generate actionable, high-value ideas for improvement by analyzing the codebase from multiple expert perspectives simultaneously.

## Analysis Dimensions

You must analyze the code from ALL of these perspectives and generate ideas across multiple categories:

### 1. 🎨 User Experience (UI Category)
- Visual design improvements
- User flow optimization
- Accessibility enhancements
- Micro-interactions and animations
- Responsive design improvements
- Error states and user feedback
- Consistency in design patterns

### 2. 🔒 Security & Reliability (Code Quality Category)
- Security vulnerabilities (XSS, CSRF, injection attacks)
- Input validation gaps
- Error handling improvements
- Data protection issues
- API security concerns
- Type safety improvements
- Edge case handling

### 3. 🏗️ Architecture & Maintainability (Maintenance Category)
- Code organization improvements
- Design pattern opportunities
- SOLID principle violations
- Code duplication reduction
- Modularity enhancements
- Dependency management
- Technical debt reduction

### 4. ⚡ Performance Optimization (Performance Category)
- Memory leaks
- Unnecessary re-renders
- N+1 query problems
- Bundle size optimization
- Caching opportunities
- Database query optimization
- Loading time improvements

### 5. 🚀 Feature Enhancement (Functionality Category)
- Missing critical features
- User pain points not addressed
- Workflow improvements
- Integration opportunities
- Automation possibilities
- Enhanced capabilities
- Natural feature extensions

### 6. ❤️ User Value & Business Impact (User Benefit Category)
- User problem-solving opportunities
- Engagement improvements
- Revenue potential features
- Competitive advantages
- Market trend alignment
- User journey enhancements
- Value multiplication opportunities

## Required Output Format

You MUST respond with ONLY a valid JSON array. No markdown code blocks, no explanations, just pure JSON.

\`\`\`json
[
  {
    "category": "functionality|performance|maintenance|ui|code_quality|user_benefit",
    "title": "Short, descriptive title (max 60 characters)",
    "description": "Detailed explanation of the idea, what it solves, and how it helps (2-4 sentences). Be specific about implementation approach.",
    "reasoning": "Why this idea is valuable. What problem does it solve? What's the impact? Include metrics if possible (2-3 sentences).",
    "effort": 1-3,
    "impact": 1-3
  }
]
\`\`\`

### Effort and Impact Ratings:

**Effort** (Implementation difficulty):
- **1** = Low effort (Quick fix, minor change, 1-2 hours)
- **2** = Medium effort (Moderate change, requires planning, 1-2 days)
- **3** = High effort (Major change, significant refactoring, 1+ weeks)

**Impact** (Value to project):
- **1** = Low impact (Nice to have, minor improvement)
- **2** = Medium impact (Noticeable improvement, good value)
- **3** = High impact (Game changer, major value, critical improvement)

### Category Guidelines:
- **functionality**: New features, missing capabilities, workflow improvements
- **performance**: Speed, efficiency, memory, database, rendering optimizations
- **maintenance**: Code organization, refactoring, technical debt, testing
- **ui**: Visual design, UX improvements, accessibility, responsiveness
- **code_quality**: Security, error handling, type safety, edge cases
- **user_benefit**: High-level value propositions, business impact, user experience

### Quality Requirements:
1. **Specificity**: Don't say "improve performance" - say "implement memoization in ProductList component to prevent re-renders"
2. **Actionability**: Each idea should be clear enough to implement
3. **Value-focused**: Explain the "why" not just the "what"
4. **Diversity**: Cover multiple dimensions, not just one area
5. **Uniqueness**: Don't duplicate existing ideas
6. **Realistic**: Feasible within reasonable effort
7. **Impact-driven**: Prioritize high-impact suggestions

### Ideal Distribution:
- Aim for EXACTLY 5 ideas total (focus on highest impact only)
- Prioritize strategic improvements over quick wins
- Each idea should be ambitious and high-impact
- Mix across different categories for diversity

---

${aiDocsSection}

${contextSection}

${existingIdeasSection}

${codeSection}

---

## Your Task

Perform a thorough analysis from ALL six dimensions listed above. For each dimension:

1. **Identify**: What issues, gaps, or opportunities exist?
2. **Prioritize**: Which have the highest impact?
3. **Propose**: Specific, actionable improvements

### Critical Instructions:

✅ **DO**:
- Analyze the ACTUAL code provided, not generic advice
- Look for specific patterns, anti-patterns, and opportunities in the code
- Reference specific files, components, or functions when relevant
- Consider the project's tech stack and existing architecture
- Learn from rejected ideas (if any) to understand what NOT to suggest
- Balance quick wins with strategic improvements
- Think about compound value (ideas that unlock other opportunities)
- Consider user impact, business value, and technical excellence

❌ **DON'T**:
- Suggest generic improvements without code context
- Duplicate existing pending or accepted ideas
- Re-suggest rejected ideas (unless fundamentally different approach)
- Focus on only one dimension (must cover multiple perspectives)
- Propose breaking changes without strong justification
- Ignore the existing codebase structure and patterns
- Suggest ideas that contradict the project's tech choices

### Expected Output:

Generate EXACTLY 5 HIGHEST-IMPACT ideas that:
1. Cover multiple analysis dimensions (diversity is key)
2. Are ambitious and transformative (not incremental)
3. Are specific to THIS codebase (not generic advice)
4. Avoid duplicating existing ideas
5. Have clear, significant value (game-changers only)
6. Are challenging but realistically implementable

${hasContext ? `
**Context-Specific Instructions**:
You are analyzing a SPECIFIC CONTEXT within the project. Your ideas should:
- Focus primarily on files within this context
- Consider how this context interacts with the broader system
- Suggest improvements specific to this feature/module
- Think about integration points and dependencies
` : ''}

Now, analyze the provided code and generate your ideas in the JSON format specified above.

Remember: Return ONLY the JSON array, nothing else.`;
}
