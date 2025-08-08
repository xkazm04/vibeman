import { Context } from '../../../../stores/contextStore';

/**
 * Generates placeholder content for a new context file
 */
export function generatePlaceholderContent(context: Context): string {
  return `# ${context.name}

## Overview
This context contains ${context.filePaths.length} files related to ${context.name.toLowerCase()}.

${context.description ? `## Description\n${context.description}\n` : ''}

## Files Included
${context.filePaths.map(path => `- \`${path}\``).join('\n')}

## Purpose
:::info
This is a placeholder context file. Edit this content to provide detailed documentation about this feature set.
:::

## Architecture

### Components
- Main components and their responsibilities
- Data flow and state management
- Key interfaces and types

### Dependencies
- External libraries used
- Internal modules referenced
- API endpoints consumed

## Implementation Notes

### Key Features
1. **Feature 1**: Description of the first key feature
2. **Feature 2**: Description of the second key feature
3. **Feature 3**: Description of the third key feature

### Code Examples

\`\`\`typescript
// Example usage or key code snippet
interface ExampleInterface {
  id: string;
  name: string;
  // Add relevant properties
}
\`\`\`

## Testing Strategy
- Unit tests coverage
- Integration test scenarios
- E2E test cases

## Future Improvements
- [ ] Enhancement 1
- [ ] Enhancement 2
- [ ] Enhancement 3

---

*Last updated: ${new Date().toLocaleDateString()}*`;
}