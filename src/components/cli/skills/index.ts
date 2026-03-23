/**
 * CLI Session Skills
 *
 * Skills are specialized instruction sets that guide Claude Code's thinking
 * for specific types of tasks. Users can toggle skills before starting a session.
 */

import { Microscope, Palette, ClipboardCheck, LucideIcon } from 'lucide-react';

export type SkillId = 'deep-analysis' | 'ui-mastery' | 'post-review';

export interface CLISkill {
  id: SkillId;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  color: string; // Tailwind color class
  prompt: string; // Instructions prepended to session
}

/**
 * Deep Analysis Skill
 * For thorough code analysis, architecture decisions, and complex problem solving
 */
const deepAnalysisSkill: CLISkill = {
  id: 'deep-analysis',
  name: 'Deep Analysis',
  shortName: 'Analysis',
  description: 'Thorough code analysis, architecture review, and systematic problem solving',
  icon: Microscope,
  color: 'violet',
  prompt: `## Deep Analysis Mode

You are operating in Deep Analysis mode. Apply these principles:

**Analysis Approach:**
- Before implementing, thoroughly analyze the existing codebase structure
- Map dependencies and understand how components interact
- Identify potential side effects of changes
- Consider edge cases and error scenarios

**Code Quality Focus:**
- Review existing patterns and maintain consistency
- Look for code smells and technical debt to address
- Ensure proper error handling and validation
- Consider performance implications

**Systematic Thinking:**
- Break complex problems into smaller, verifiable steps
- Document your reasoning for architectural decisions
- Verify assumptions by reading relevant code first
- Test incrementally rather than making large changes

**Output Expectations:**
- Explain your analysis before implementing
- Note any concerns or trade-offs discovered
- Suggest improvements beyond the immediate requirement when relevant
`,
};

/**
 * UI Mastery Skill
 * For frontend development, design systems, and user experience
 */
const uiMasterySkill: CLISkill = {
  id: 'ui-mastery',
  name: 'UI Mastery',
  shortName: 'UI',
  description: 'Frontend expertise, design systems, animations, and UX patterns',
  icon: Palette,
  color: 'pink',
  prompt: `## UI Mastery Mode

You are operating in UI Mastery mode. Apply these principles:

**Design System Awareness:**
- Follow existing design patterns, spacing, and color schemes
- Maintain consistent typography and component sizing
- Respect the established component library conventions
- Use Tailwind classes consistently with the codebase style

**User Experience Focus:**
- Consider accessibility (ARIA labels, keyboard navigation, focus states)
- Add appropriate loading states and transitions
- Handle empty states and error states gracefully
- Ensure responsive behavior across screen sizes

**Visual Polish:**
- Add subtle animations using Framer Motion where appropriate
- Use proper hover/active/focus states for interactive elements
- Ensure visual hierarchy guides user attention
- Pay attention to spacing, alignment, and visual balance

**Component Architecture:**
- Keep components focused and reusable
- Separate presentation from logic where beneficial
- Use proper TypeScript types for props
- Follow React best practices (hooks, memoization when needed)

**Output Expectations:**
- Consider how the UI will feel to use, not just how it looks
- Ensure interactions are intuitive and discoverable
- Test visual changes at different viewport sizes mentally
- Note any UX improvements that could enhance the feature
`,
};

/**
 * Post-Implementation Review Skill
 * Language/framework agnostic test, evaluation, and quality scoring
 */
const postReviewSkill: CLISkill = {
  id: 'post-review',
  name: 'Post Review',
  shortName: 'Review',
  description: 'Auto-test, evaluate, and score implementation quality after each task',
  icon: ClipboardCheck,
  color: 'emerald',
  prompt: `## Post-Implementation Review Mode

After completing ALL implementation work for this task, perform a mandatory review phase.

### Step 1: Detect Test Framework
Check these indicators and use whichever exists:
- **Node/JS**: package.json scripts.test, jest.config, vitest.config → run: npm test or npx vitest run
- **Python**: pytest.ini, pyproject.toml [tool.pytest] → run: pytest
- **Rust**: Cargo.toml → run: cargo test
- **Go**: go.mod → run: go test ./...
- **Makefile**: test target → run: make test
If no test framework is detected, note "no tests configured" and skip to Step 2.

### Step 2: Run Scoped Tests
Prefer scoped execution targeting modified files:
- jest --findRelatedTests <modified-files>
- pytest <modified-test-files>
- cargo test <modified-module>
If scoping is unavailable, run the full suite.

### Step 3: Regression Check
Run the appropriate type/lint check:
- TypeScript: npx tsc --noEmit (filter errors to modified files only)
- Python: mypy or ruff check on modified files
- Rust: cargo clippy
- Go: go vet ./...
**If regressions are found, FIX THEM before continuing to Step 4.**

### Step 4: Quality Assessment
Score the implementation 1-10:
- **Requirement fulfillment** (3 pts): Does it satisfy all stated requirements?
- **Code quality** (3 pts): Consistent patterns, proper error handling, type safety?
- **No regressions** (2 pts): Zero new type/lint errors? Existing tests still pass?
- **Test coverage** (2 pts): Relevant tests pass? New tests added for new functionality?

### Step 5: Report Results
After assessment, report via curl (replace placeholders):

\`\`\`bash
curl -s -X POST http://localhost:3000/api/implementation-logs/review \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "<PROJECT_ID>",
    "requirementName": "<REQUIREMENT_NAME>",
    "qualityScore": <1-10>,
    "qualityNotes": "<brief assessment summary>",
    "testsPassed": <true|false>,
    "testsRun": <number>,
    "testsFailed": <number>,
    "regressions": ["<regression1>", "<regression2>"],
    "fixes": ["<fix1>", "<fix2>"]
  }'
\`\`\`

If the curl fails, continue — review reporting is non-blocking.
`,
};

/**
 * All available skills
 */
export const CLI_SKILLS: Record<SkillId, CLISkill> = {
  'deep-analysis': deepAnalysisSkill,
  'ui-mastery': uiMasterySkill,
  'post-review': postReviewSkill,
};

/**
 * Get skill by ID
 */
export function getSkill(id: SkillId): CLISkill {
  return CLI_SKILLS[id];
}

/**
 * Get all skills as array
 */
export function getAllSkills(): CLISkill[] {
  return Object.values(CLI_SKILLS);
}

/**
 * Build combined prompt from enabled skills
 */
export function buildSkillsPrompt(enabledSkills: SkillId[]): string {
  if (enabledSkills.length === 0) return '';

  const prompts = enabledSkills
    .map((id) => CLI_SKILLS[id]?.prompt)
    .filter(Boolean);

  if (prompts.length === 0) return '';

  return `# Active Skills

${prompts.join('\n\n---\n\n')}

---

Now proceed with the task:

`;
}
