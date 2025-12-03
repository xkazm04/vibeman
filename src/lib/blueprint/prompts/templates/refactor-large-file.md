## Refactor Large Files

Found {{issueCount}} file(s) that exceed the recommended size and should be split.

### Files Affected
{{fileList}}

### Issues to Address
{{issueDetails}}

### Guidelines
1. Identify logical groupings within the file
2. Extract related functions/classes into separate modules
3. Use barrel exports (index.ts) for clean imports
4. Keep each file focused on a single responsibility
5. Aim for files under 300 lines

### Refactoring Strategies
- Extract utility functions to shared utils
- Split components into smaller, focused components
- Create separate files for types/interfaces
- Move constants to dedicated config files
- Extract hooks into separate hook files

### Acceptance Criteria
- [ ] Large files split into smaller modules
- [ ] Each new file has a single responsibility
- [ ] Imports updated across the codebase
- [ ] Build passes without errors
- [ ] No functionality changes
