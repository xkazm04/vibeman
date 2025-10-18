import { ImpactedFile } from '../lib/backlogTypes';

/**
 * Generate the prompt for creating code from a backlog task
 */
export function generateCodingTaskPrompt(params: {
  title: string;
  description: string;
  steps: string[];
  impactedFiles: ImpactedFile[];
  filesContext: string;
  filesToCreate: ImpactedFile[];
  filesToUpdate: ImpactedFile[];
}): string {
  const { title, description, steps, impactedFiles, filesContext, filesToCreate, filesToUpdate } = params;

  return `You are a senior full-stack developer with expertise in React, TypeScript, Next.js, and modern web development practices. Your task is to implement a backlog item with the same quality and attention to detail as a seasoned professional working on a production codebase.

## Implementation Brief

**Feature**: ${title}
**Objective**: ${description}

**Implementation Roadmap**:
${steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

## Codebase Context

### New Components to Create (${filesToCreate.length})
${filesToCreate.map(f => `- ${f.filepath} (new implementation)`).join('\n') || 'None'}

### Existing Components to Modify (${filesToUpdate.length})
${filesToUpdate.map(f => `- ${f.filepath} (enhancement/modification)`).join('\n') || 'None'}

## Current Implementation State
${filesContext}

## Development Standards

As a senior developer, implement this feature following these professional standards:

**Code Quality & Architecture:**
- Write clean, maintainable, and self-documenting code
- Follow established patterns and conventions from the existing codebase
- Implement proper separation of concerns and single responsibility principle
- Use TypeScript effectively with proper type definitions and interfaces
- Apply React best practices including proper hooks usage and component composition

**Technical Implementation:**
- Ensure all imports are correctly resolved and dependencies are properly managed
- Implement comprehensive error handling and edge case management
- Add meaningful comments for complex business logic and architectural decisions
- Use consistent naming conventions and code formatting
- Optimize for performance while maintaining readability

**Production Readiness:**
- Include proper error boundaries and fallback states
- Implement loading states and user feedback mechanisms
- Ensure accessibility compliance (ARIA labels, keyboard navigation, etc.)
- Add proper validation for user inputs and API responses
- Consider mobile responsiveness and cross-browser compatibility

**Integration & Testing:**
- Ensure seamless integration with existing components and services
- Write code that is easily testable and mockable
- Include proper prop validation and default values
- Handle asynchronous operations correctly with proper cleanup

## Implementation Requirements

Generate production-quality code for ALL ${impactedFiles.length} files listed above. Each file should be complete, functional, and ready for immediate deployment.

**Output Format** (use exactly this format for each file):

${filesToCreate.map(f => `\`\`\`code-file:${f.filepath}|create\`\`\`
[Complete, production-ready implementation]
\`\`\``).join('\n\n')}

${filesToUpdate.map(f => `\`\`\`code-file:${f.filepath}|update\`\`\`
[Complete, updated implementation with all existing functionality preserved]
\`\`\``).join('\n\n')}

## Critical Success Criteria

- **Completeness**: Every file must be fully implemented with no placeholders or TODOs
- **Integration**: Code must work seamlessly with the existing codebase
- **Quality**: Code must meet senior-level standards for maintainability and performance
- **Functionality**: Implementation must fully satisfy the requirements outlined in the task description

Implement this feature with the same rigor and expertise you would apply to any critical production system. Focus on creating robust, scalable, and maintainable code that other senior developers would approve in a code review.`;
}
