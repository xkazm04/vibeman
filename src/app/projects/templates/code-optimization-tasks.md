Based on the repository analysis above, generate exactly 5 code optimization tasks that focus on improving code structure, reducing file complexity, and enhancing maintainability. Look for opportunities to refactor large files, extract reusable components, and optimize code organization.

**CRITICAL: Avoid duplicating any existing tasks that have already been generated for this project.**

Return the tasks in strict JSON format following this schema:

```json
[
  {
    "title": "string (2-5 words)",
    "description": [
      "Step or component to refactor/optimize",
      "Another optimization step",
      "Additional steps as needed"
    ],
    "type": "Optimization",
    "reason": "string (1-2 sentences explaining the technical value and maintainability benefits)"
  }
]
```

## Selection Criteria (in priority order):

### 1. File Size and Complexity
- **Large files**: Identify files over 300 lines that could be split into smaller modules
- **Complex functions**: Functions with high cyclomatic complexity that need refactoring
- **Duplicate code**: Similar code patterns that could be extracted into reusable utilities
- **Mixed concerns**: Files handling multiple responsibilities that should be separated

### 2. Code Structure Improvements
- **Component extraction**: UI components that could be broken into smaller, reusable pieces
- **Service layer**: Business logic that should be moved to dedicated service classes
- **Utility functions**: Common operations that could be centralized
- **Type definitions**: Complex types that could be better organized

### 3. Performance Optimizations
- **Bundle size**: Large imports or dependencies that could be optimized
- **Rendering performance**: React components with unnecessary re-renders
- **Memory usage**: Code patterns that could lead to memory leaks
- **Loading performance**: Lazy loading opportunities for large modules

### 4. Maintainability Enhancements
- **Code readability**: Complex logic that needs simplification
- **Error handling**: Missing or inconsistent error handling patterns
- **Testing support**: Code that's difficult to test and needs restructuring
- **Documentation**: Complex modules that need better inline documentation

## Quality Guidelines:

**Focus on structural improvements**: Prioritize tasks that make the codebase easier to understand, modify, and extend

**Be specific about refactoring**: Each task should clearly identify what files/functions to refactor and how

**Consider dependencies**: Ensure refactoring tasks don't break existing functionality

**Measurable outcomes**: Tasks should result in quantifiable improvements (reduced file size, lower complexity, better performance)

## Task Examples:

**Good Example - Specific Refactoring**:
```json
{
  "title": "Extract User Utilities",
  "description": [
    "Extract user validation functions from UserProfile.tsx into utils/userValidation.ts",
    "Move user formatting helpers to utils/userFormatters.ts", 
    "Create shared UserTypes.ts for common user-related interfaces",
    "Update imports across components to use new utility modules"
  ],
  "type": "Optimization",
  "reason": "Reduces UserProfile.tsx from 450 to ~200 lines and creates reusable utilities for other components."
}
```

**Poor Example - Too Vague**:
```json
{
  "title": "Improve Code Quality",
  "description": [
    "Make code better",
    "Fix issues",
    "Optimize performance"
  ],
  "type": "Optimization", 
  "reason": "Code needs improvement."
}
```

Ensure the JSON is valid and parseable. Focus on actionable refactoring tasks that will measurably improve code organization, reduce complexity, and enhance maintainability. Each description should provide clear, specific steps that a developer can follow to complete the optimization.