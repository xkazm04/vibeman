## Extract Duplicate Code

Found {{issueCount}} instance(s) of duplicated code that should be consolidated.

### Files Affected
{{fileList}}

### Issues to Address
{{issueDetails}}

### Guidelines
1. Extract common code into shared functions
2. Place utilities in appropriate shared modules
3. Consider generics for type-safe reuse
4. Maintain backward compatibility
5. Use descriptive names for extracted functions

### Extraction Strategies
- Create utility functions in shared/utils
- Extract as a custom hook if React-related
- Use higher-order functions for similar patterns
- Consider factory functions for object creation
- Create base classes for shared behavior

### Acceptance Criteria
- [ ] Duplicate code extracted to shared utilities
- [ ] All instances updated to use shared code
- [ ] DRY principle applied
- [ ] Build passes without errors
- [ ] Functionality unchanged
