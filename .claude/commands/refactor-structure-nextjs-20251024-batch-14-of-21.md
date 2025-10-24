# Structure Refactoring (Batch 14/21)

## Project Type: Next.js 15 (App Router)

## Overview

This requirement addresses structural violations detected in the codebase. Following proper project structure improves:
- **Code Organization**: Easier to find and maintain files
- **Developer Experience**: Predictable locations for different types of code
- **Scalability**: Clear patterns for adding new features
- **Team Collaboration**: Consistent structure across the team

## Structure Violations Detected


### 1. src/app/projects/ProjectAI/LLMSelector.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/LLMSelector.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "LLMSelector.tsx" is not allowed in src/app/projects/ProjectAI/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/LLMSelector.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 2. src/app/projects/ProjectAI/log.txt

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/log.txt`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "log.txt" is not allowed in src/app/projects/ProjectAI/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/log.txt`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 3. src/app/projects/ProjectAI/memory

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/memory`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "memory" is not allowed in src/app/projects/ProjectAI/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/memory`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 4. src/app/projects/ProjectAI/memory/scanGoalsExample.md

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/memory/scanGoalsExample.md`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "scanGoalsExample.md" is not allowed in src/app/projects/ProjectAI/memory/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/memory/scanGoalsExample.md`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 5. src/app/projects/ProjectAI/memory/scanGoalsPrompt.md

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/memory/scanGoalsPrompt.md`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "scanGoalsPrompt.md" is not allowed in src/app/projects/ProjectAI/memory/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/memory/scanGoalsPrompt.md`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 6. src/app/projects/ProjectAI/memory/specs.md

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/memory/specs.md`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "specs.md" is not allowed in src/app/projects/ProjectAI/memory/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/memory/specs.md`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 7. src/app/projects/ProjectAI/promptFunctions.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/promptFunctions.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "promptFunctions.ts" is not allowed in src/app/projects/ProjectAI/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/promptFunctions.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 8. src/app/projects/ProjectAI/ScanGoals

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/ScanGoals`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "ScanGoals" is not allowed in src/app/projects/ProjectAI/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/ScanGoals`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 9. src/app/projects/ProjectAI/ScanGoals/generateGoals.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/ScanGoals/generateGoals.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "generateGoals.ts" is not allowed in src/app/projects/ProjectAI/ScanGoals/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/ScanGoals/generateGoals.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 10. src/app/projects/ProjectAI/ScanGoals/GoalResultDisplay.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/ScanGoals/GoalResultDisplay.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "GoalResultDisplay.tsx" is not allowed in src/app/projects/ProjectAI/ScanGoals/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/ScanGoals/GoalResultDisplay.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 11. src/app/projects/ProjectAI/ScanGoals/lib

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/ScanGoals/lib`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "lib" is not allowed in src/app/projects/ProjectAI/ScanGoals/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/ScanGoals/lib`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 12. src/app/projects/ProjectAI/ScanGoals/lib/prompts.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/ScanGoals/lib/prompts.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "prompts.ts" is not allowed in src/app/projects/ProjectAI/ScanGoals/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/ScanGoals/lib/prompts.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 13. src/app/projects/ProjectAI/ScanGoals/lib/sectionBuilders.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/ScanGoals/lib/sectionBuilders.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "sectionBuilders.ts" is not allowed in src/app/projects/ProjectAI/ScanGoals/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/ScanGoals/lib/sectionBuilders.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 14. src/app/projects/ProjectAI/ScanGoals/lib/utils.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/ScanGoals/lib/utils.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "utils.ts" is not allowed in src/app/projects/ProjectAI/ScanGoals/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/ScanGoals/lib/utils.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 15. src/app/projects/ProjectAI/ScanIdeas

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/ScanIdeas`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "ScanIdeas" is not allowed in src/app/projects/ProjectAI/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/ScanIdeas`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 16. src/app/projects/ProjectAI/ScanIdeas/generateIdeas.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/ScanIdeas/generateIdeas.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "generateIdeas.ts" is not allowed in src/app/projects/ProjectAI/ScanIdeas/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/ScanIdeas/generateIdeas.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 17. src/app/projects/ProjectAI/ScanIdeas/lib

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/ScanIdeas/lib`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "lib" is not allowed in src/app/projects/ProjectAI/ScanIdeas/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/ScanIdeas/lib`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 18. src/app/projects/ProjectAI/ScanIdeas/lib/prompts.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/ScanIdeas/lib/prompts.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "prompts.ts" is not allowed in src/app/projects/ProjectAI/ScanIdeas/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/ScanIdeas/lib/prompts.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 19. src/app/projects/ProjectAI/ScanIdeas/lib/sectionBuilders.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/ScanIdeas/lib/sectionBuilders.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "sectionBuilders.ts" is not allowed in src/app/projects/ProjectAI/ScanIdeas/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/ScanIdeas/lib/sectionBuilders.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 20. src/app/projects/ProjectAI/ScanIdeas/lib/specializdPrompts.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/projects/ProjectAI/ScanIdeas/lib/specializdPrompts.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "specializdPrompts.ts" is not allowed in src/app/projects/ProjectAI/ScanIdeas/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/projects/ProjectAI/ScanIdeas/lib/specializdPrompts.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references


## General Structure Guidelines for Next.js

### Next.js 15 Enforced Structure (with src/)

Strict Next.js structure with explicit folder and file rules (assumes src/ folder exists)

**Directory Structure:**

- **`src/`**: Source code directory - only specified folders allowed
  - Allowed folders:
    - `app` - Next.js App Router - pages, layouts, and routes
    - `components` - Shared/reusable components only
    - `hooks` - Custom React hooks
    - `lib` - Business logic, utilities, and services
    - `stores` - Zustand state management stores
    - `types` - TypeScript type definitions
  - ⚠️ **Strict mode**: Only explicitly listed items are allowed
  - **`src/app/`**: App Router directory - pages and API routes
    - Allowed folders:
      - `api` - API route handlers
      - `features` - Shared feature components and logic
      - `*-page` - Page folders (must end with -page)
    - Allowed files:
      - `globals.css` - Global CSS styles
      - `favicon.ico` - Favicon icon
      - `layout.tsx` - Root layout component
      - `page.tsx` - Root page component
    - ⚠️ **Strict mode**: Only explicitly listed items are allowed
    - **`src/app/features/`**: Shared feature components - supports subfeatures one level deep
      - Allowed folders:
        - `components` - Feature-specific components
        - `lib` - Feature-specific utilities and logic
        - `sub_*` - Subfeatures (one level only)
      - Allowed files:
        - `*` - Any file types allowed in features root
      - ⚠️ **Strict mode**: Only explicitly listed items are allowed
      - **`src/app/features/sub_*/`**: Subfeature folders - cannot have nested subfeatures
        - Allowed folders:
          - `components` - Subfeature components
          - `lib` - Subfeature utilities
        - Allowed files:
          - `*` - Any file types allowed in subfeatures
        - ⚠️ **Strict mode**: Only explicitly listed items are allowed


    - **`src/app/api/`**: API routes with recursive subdirectories
      - Allowed folders:
        - `*` - API route folders (recursive)
      - Allowed files:
        - `route.ts` - API route handler
        - `*.ts` - TypeScript files for API logic


  - **`src/components/`**: Shared components - recursive structure allowed
    - Allowed folders:
      - `*` - Component folders (recursive)
    - Allowed files:
      - `*.tsx` - React components
      - `*.ts` - TypeScript utilities
      - `*.css` - Component styles

  - **`src/lib/`**: Business logic and utilities - recursive structure allowed
    - Allowed folders:
      - `*` - Utility folders (recursive)
    - Allowed files:
      - `*.ts` - TypeScript files
      - `*.tsx` - React utilities

  - **`src/hooks/`**: Custom React hooks
    - Allowed files:
      - `*.ts` - Hook files
      - `*.tsx` - Hook files with JSX

  - **`src/stores/`**: Zustand stores
    - Allowed files:
      - `*.ts` - Store files

  - **`src/types/`**: TypeScript types
    - Allowed files:
      - `*.ts` - Type definition files


**Anti-Patterns (AVOID):**

- ❌ `src/pages/**` - Pages Router directory (legacy)
  - Use instead: `src/app/`
- ❌ `src/utils/**` - Utils directory
  - Use instead: `src/lib/`
- ❌ `src/helpers/**` - Helpers directory
  - Use instead: `src/lib/`
- ❌ `src/app/features/sub_*/sub_*/**` - Nested subfeatures (not allowed)
  - Use instead: `Flatten to src/app/features/sub_*/`

**Key Principles:**

1. **Strict src/ structure**: Only `app`, `components`, `hooks`, `lib`, `stores`, and `types` folders are allowed in `src/`
2. **App Router structure**: Only `api`, `features`, and `*-page` folders allowed in `src/app/`, plus specific root files
3. **Feature organization**: Use `src/app/features/` for shared feature logic with optional `sub_*` subfeatures (one level only)
4. **No nested subfeatures**: Subfeatures (`sub_*`) cannot contain other subfeatures
5. **Consistent naming**: Use `src/lib/` for all utilities (not `utils/` or `helpers/`)


## Instructions

1. **Review Each Violation**: Understand why the current structure is problematic
2. **Plan the Refactoring**: Identify all files that need to be moved/modified
3. **Move Files Systematically**: Use your file operations to move files
4. **Update Imports**: Search for and update all import statements that reference moved files
5. **Test After Each Move**: Verify the application still works correctly
6. **Commit Changes**: Group related moves into logical commits

## Important Notes

- **DO NOT** break existing functionality while refactoring
- **DO** update all import statements after moving files
- **DO** test the application after major structural changes
- **DO** preserve file content - only change locations and imports
- **AVOID** moving too many files at once - refactor incrementally

## Success Criteria

✅ All 20 violations in this batch are resolved
✅ All imports are updated and working
✅ Application builds without errors
✅ No broken functionality

## Project Path

`C:\Users\kazda\kiro\vibeman`

Begin refactoring now. Work through each violation systematically.
