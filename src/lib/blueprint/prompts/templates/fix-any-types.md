## Fix Any Type Usage

Found {{issueCount}} usage(s) of the `any` type that should be replaced with specific types.

### Files Affected
{{fileList}}

### Issues to Address
{{issueDetails}}

### Guidelines
1. Replace `any` with specific types where the type is known
2. Use `unknown` if the type is truly unknown and needs to be narrowed
3. Consider using generics for flexible typing
4. Use type guards for runtime type checking
5. For third-party libraries, check for `@types/` packages

### Common Replacements
- `any[]` → `unknown[]` or specific type array
- `Record<string, any>` → `Record<string, unknown>` or specific value type
- Function params → Use proper parameter types
- API responses → Create interface definitions

### Acceptance Criteria
- [ ] All flagged `any` types replaced with specific types
- [ ] TypeScript compilation passes
- [ ] No new `any` types introduced
- [ ] Type safety improved without breaking functionality
