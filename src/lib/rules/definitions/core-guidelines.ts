/**
 * Core Implementation Guidelines Rule
 * Always included - provides basic implementation steps
 */

import type { RuleDefinition } from '../types';

export const coreGuidelinesRule: RuleDefinition = {
  id: 'core-guidelines',
  name: 'Core Implementation Guidelines',
  description: 'Basic steps for implementing requirements',
  category: 'implementation',
  priority: 'high',
  alwaysInclude: true,
  order: 10,
  content: `## Implementation Guidelines

**Steps**:
1. Analyze the requirement thoroughly
2. Identify all files that need to be modified or created
3. Implement all changes specified in the requirement
4. Follow implementation steps precisely
5. Run any tests if specified
6. Ensure all changes are complete before finishing`,
};
