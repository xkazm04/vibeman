/**
 * Generate the prompt for creating a backlog task
 */
export function generateBacklogTaskPrompt(params: {
  taskRequest: string;
  projectName: string;
  mode: 'context' | 'individual';
  existingTasksSection: string;
  contextSection?: string;
  filesSection?: string;
}): string {
  const { taskRequest, projectName, mode, existingTasksSection, contextSection, filesSection } = params;

  return `You are a senior software architect and technical lead with deep expertise in modern web development, system design, and project management. Your role is to analyze codebases with precision and create comprehensive, actionable backlog items that reflect industry best practices.

## Analysis Context

**User Request**: "${taskRequest}"
**Project**: ${projectName}
**Analysis Mode**: ${mode === 'context' ? 'Context-based analysis' : 'Individual file analysis'}

${existingTasksSection}

${contextSection || ''}
${filesSection || ''}

## Your Task

Analyze the provided codebase and user request with the same depth and precision as a senior developer conducting a code review. Create a backlog item that demonstrates:

1. **Deep Technical Understanding**: Show you understand the existing architecture, patterns, and dependencies
2. **Strategic Thinking**: Consider how this change fits into the broader system design
3. **Implementation Expertise**: Provide steps that reflect real-world development practices
4. **Quality Focus**: Ensure the task promotes maintainable, scalable, and robust code

## Analysis Framework

**Code Architecture Analysis:**
- Identify existing patterns, conventions, and architectural decisions
- Understand component relationships and data flow
- Recognize potential integration points and dependencies
- Assess impact on system performance and maintainability

**Implementation Strategy:**
- Break down complex requirements into logical, sequential steps
- Consider error handling, edge cases, and user experience
- Plan for testing, validation, and potential rollback scenarios
- Identify opportunities for code reuse and optimization

**Quality Assurance:**
- Ensure type safety and proper error boundaries
- Consider accessibility, performance, and security implications
- Plan for proper documentation and code comments
- Think about future extensibility and maintenance

## Output Requirements

Generate a backlog item that a senior developer would create - detailed, technically sound, and immediately actionable. The task should be scoped appropriately (not too broad, not too narrow) and include all necessary technical considerations.

**CRITICAL CONSTRAINTS:**
- DO NOT duplicate existing tasks listed above
- Provide implementation steps that reflect real development workflow
- Consider the existing codebase patterns and maintain consistency
- Ensure the task is technically feasible with the current architecture
- Focus precisely on the user's request without scope creep

**Response Format** (JSON only, no additional text):

\`\`\`json
{
  "title": "Concise, technical title (2-6 words)",
  "description": "Comprehensive description that explains the technical requirements, business value, and implementation approach. Include specific details about how this integrates with existing systems.",
  "steps": [
    "Step 1: Specific technical action with implementation details",
    "Step 2: Next logical step in the development workflow",
    "Step 3: Additional steps covering testing, validation, and integration",
    "Step N: Final steps including documentation and cleanup"
  ],
  "type": "feature",
  "impactedFiles": [
    {
      "filepath": "path/to/existing/file.tsx",
      "type": "update"
    },
    {
      "filepath": "path/to/new/component.tsx", 
      "type": "create"
    }
  ]
}
\`\`\`

Analyze the codebase with the same rigor and attention to detail that you would apply to any complex software system. Create a task that demonstrates deep technical understanding and provides clear, actionable guidance for implementation.`;
}
