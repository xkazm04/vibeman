/**
 * Test Selectors Guidelines Rule
 * CRITICAL - Always included - ensures UI components have test IDs
 */

import type { RuleDefinition } from '../types';

export const testSelectorsRule: RuleDefinition = {
  id: 'test-selectors',
  name: 'Test Selectors Guidelines',
  description: 'Add data-testid attributes to interactive UI components',
  category: 'testing',
  priority: 'critical',
  alwaysInclude: true,
  order: 30,
  content: `## Test Selectors

**CRITICAL**: Add \`data-testid\` attributes to ALL interactive UI components for automated testing.

**Guidelines**:
- Add to all clickable elements (buttons, links, icons)
- Use descriptive kebab-case: \`data-testid="submit-form-btn"\`
- Include component context: \`data-testid="goal-delete-btn"\`, \`data-testid="project-settings-modal"\`
- Add to form inputs: \`data-testid="email-input"\`
- Add to list items: \`data-testid="task-item-123"\`

**Example**:
\`\`\`tsx
<button onClick={handleSubmit} data-testid="create-goal-btn">
  Create Goal
</button>

<input
  type="text"
  value={title}
  onChange={handleChange}
  data-testid="goal-title-input"
/>
\`\`\``,
};
