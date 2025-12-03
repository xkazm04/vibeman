## Reduce Cyclomatic Complexity

Found {{issueCount}} function(s) with high cyclomatic complexity that should be simplified.

### Files Affected
{{fileList}}

### Issues to Address
{{issueDetails}}

### Guidelines
1. Extract complex conditions into named boolean functions
2. Use early returns to reduce nesting depth
3. Consider the strategy pattern for switch statements
4. Replace nested conditionals with guard clauses
5. Aim for complexity under 10

### Complexity Reduction Strategies
- Extract conditions: `if (a && b || c)` → `if (shouldProcess())`
- Use lookup tables instead of switch/if chains
- Apply polymorphism for type-based branching
- Use optional chaining to reduce null checks
- Consider breaking into multiple smaller functions

### Acceptance Criteria
- [ ] Complex functions simplified
- [ ] Cyclomatic complexity reduced below threshold
- [ ] Code more readable and maintainable
- [ ] Build passes without errors
- [ ] Functionality unchanged
