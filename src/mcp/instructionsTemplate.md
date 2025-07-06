# Background Agent Instructions Templates

## For Feature Implementation:

```
Please implement [FEATURE NAME] with the following requirements:
- Read the existing codebase to understand the current architecture
- Follow the existing code patterns and conventions
- Create necessary files and folders
- Implement the feature with proper error handling
- Add appropriate comments and documentation
- Include basic unit tests
- Update any relevant documentation files

Task Details:
[PASTE TASK DESCRIPTION AND ACCEPTANCE CRITERIA]
```

## For Bug Fixes:

```
Please fix the following bug:
- First, reproduce the issue to understand it
- Identify the root cause
- Implement a fix that doesn't break existing functionality
- Add tests to prevent regression
- Document what was changed and why

Bug Details:
[PASTE BUG DESCRIPTION]
```

## For Testing Tasks:

```
Please add comprehensive tests for [COMPONENT/FEATURE]:
- Analyze the existing code to understand all use cases
- Create unit tests covering happy paths and edge cases
- Ensure at least 80% code coverage
- Use the project's existing testing framework
- Follow the testing patterns already in the codebase

Testing Requirements:
[PASTE TESTING REQUIREMENTS]
```

## For Performance Optimization:

```
Please optimize [SPECIFIC AREA]:
- Profile the current performance
- Identify bottlenecks
- Implement optimizations
- Measure performance improvements
- Ensure no functionality is broken
- Document the changes and performance gains

Optimization Target:
[PASTE OPTIMIZATION DETAILS]
```