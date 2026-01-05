/**
 * File Structure Guidelines Rule
 * Always included - provides Next.js/React file organization guidance
 */

import type { RuleDefinition } from '../types';

export const fileStructureRule: RuleDefinition = {
  id: 'file-structure',
  name: 'File Structure Guidelines',
  description: 'Next.js/React project file organization',
  category: 'structure',
  priority: 'high',
  alwaysInclude: true,
  order: 20,
  content: `## File Structure (Next.js/React Projects)

**Feature-Specific Files** (use \`app/features/<feature>\` structure):
- \`app/features/<feature>/components/\` - Feature-specific components and UI
- \`app/features/<feature>/lib/\` - Feature-specific functions, utilities, helpers
- \`app/features/<feature>/\` - Main wrapper, index, or page file

**Reusable UI Components** (use \`app/components/ui\` structure):
- \`app/components/ui/\` - Shared, reusable UI elements across multiple features`,
};
