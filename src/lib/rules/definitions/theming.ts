/**
 * Theming and Styling Guidelines Rule
 * Always included - ensures UI consistency
 */

import type { RuleDefinition } from '../types';

export const themingRule: RuleDefinition = {
  id: 'theming',
  name: 'Theming and Styling Guidelines',
  description: 'Ensure UI components match existing design language',
  category: 'styling',
  priority: 'medium',
  alwaysInclude: true,
  order: 40,
  content: `## Theming and Styling

**Before creating new UI components**:
1. Examine existing components in the project
2. Match the color scheme, spacing, and visual patterns
3. Use consistent className patterns (Tailwind CSS)
4. Follow the app's design language (glassmorphism, gradients, shadows, etc.)
5. Support dark mode if the app uses it`,
};
