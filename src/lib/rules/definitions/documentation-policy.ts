/**
 * Documentation Policy Rule
 * CRITICAL - Always included - prevents over-documentation
 */

import type { RuleDefinition } from '../types';

export const documentationPolicyRule: RuleDefinition = {
  id: 'documentation-policy',
  name: 'Documentation Policy',
  description: 'Guidelines on when to create documentation',
  category: 'documentation',
  priority: 'critical',
  alwaysInclude: true,
  order: 50,
  content: `## Documentation Policy

**CRITICAL RULE**: Do NOT create separate documentation files (.md, README.md, docs/) for routine implementations.

**Only create documentation when**:
- Implementing a NEW major feature or module (not refactorings)
- Adding a NEW API or public interface
- Creating NEW architectural patterns
- The requirement explicitly asks for documentation

**Do NOT create documentation for**:
- Bug fixes
- Refactorings
- Small adjustments
- UI changes
- Database schema changes
- Performance improvements
- Code quality improvements

**For all implementations**: Create an implementation log entry (see next section) - this is your primary documentation.`,
};
