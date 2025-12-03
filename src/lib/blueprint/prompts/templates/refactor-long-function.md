## Refactor Long Functions

Found {{issueCount}} function(s) that exceed the recommended length and should be simplified.

### Files Affected
{{fileList}}

### Issues to Address
{{issueDetails}}

### Guidelines
1. Extract distinct operations into helper functions
2. Use early returns to reduce nesting
3. Consider extracting to separate utility files if reusable
4. Aim for functions under 50 lines
5. Each function should do one thing well

### Refactoring Strategies
- Extract validation logic into separate functions
- Extract data transformation into helpers
- Use composition over deep nesting
- Consider the Extract Method refactoring pattern
- Group related operations into logical functions

### Acceptance Criteria
- [ ] Long functions split into smaller functions
- [ ] Each function has a clear single purpose
- [ ] Code readability improved
- [ ] Build passes without errors
- [ ] Functionality unchanged
