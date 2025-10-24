# Structure Refactoring (Batch 20/21)

## Project Type: Next.js 15 (App Router)

## Overview

This requirement addresses structural violations detected in the codebase. Following proper project structure improves:
- **Code Organization**: Easier to find and maintain files
- **Developer Experience**: Predictable locations for different types of code
- **Scalability**: Clear patterns for adding new features
- **Team Collaboration**: Consistent structure across the team

## Structure Violations Detected


### 1. src/app/voicebot/lib/index.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/voicebot/lib/index.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "index.ts" is not allowed in src/app/voicebot/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/voicebot/lib/index.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 2. src/app/voicebot/lib/voicebotApi.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/voicebot/lib/voicebotApi.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "voicebotApi.ts" is not allowed in src/app/voicebot/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/voicebot/lib/voicebotApi.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 3. src/app/voicebot/lib/voicebotTypes.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/voicebot/lib/voicebotTypes.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "voicebotTypes.ts" is not allowed in src/app/voicebot/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/voicebot/lib/voicebotTypes.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 4. src/app/voicebot/lib/voicebotUtils.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/voicebot/lib/voicebotUtils.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "voicebotUtils.ts" is not allowed in src/app/voicebot/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/voicebot/lib/voicebotUtils.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 5. src/app/voicebot/README.md

**Issue**: Anti-pattern detected

**Current Location**: `src/app/voicebot/README.md`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "README.md" is not allowed in src/app/voicebot/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/voicebot/README.md`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 6. src/app/voicebot/VoicebotPillar.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/voicebot/VoicebotPillar.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "VoicebotPillar.tsx" is not allowed in src/app/voicebot/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/voicebot/VoicebotPillar.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 7. src/contexts

**Issue**: Anti-pattern detected

**Current Location**: `src/contexts`

**Expected Location**: `Move to appropriate subfolder (app, components, lib, hooks, stores, types)`

**Reason**: Folder "contexts" is not allowed in src/. (Strict mode: only explicitly allowed items permitted) Allowed folders: app, components, hooks, lib, stores, types

**Action Required**:
- Refactor or relocate `src/contexts`
- Follow the pattern: Move to appropriate subfolder (app, components, lib, hooks, stores, types)
- Update imports and references

---

### 8. src/contexts/ModalContext.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/contexts/ModalContext.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "ModalContext.tsx" is not allowed in src/contexts/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/contexts/ModalContext.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 9. src/helpers

**Issue**: Anti-pattern detected

**Current Location**: `src/helpers`

**Expected Location**: `Move to appropriate subfolder (app, components, lib, hooks, stores, types)`

**Reason**: Folder "helpers" is not allowed in src/. (Strict mode: only explicitly allowed items permitted) Allowed folders: app, components, hooks, lib, stores, types

**Action Required**:
- Refactor or relocate `src/helpers`
- Follow the pattern: Move to appropriate subfolder (app, components, lib, hooks, stores, types)
- Update imports and references

---

### 10. src/helpers/pathValidation.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/helpers/pathValidation.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "pathValidation.ts" is not allowed in src/helpers/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/helpers/pathValidation.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 11. src/helpers/timelineStyles.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/helpers/timelineStyles.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "timelineStyles.tsx" is not allowed in src/helpers/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/helpers/timelineStyles.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 12. src/helpers/typeStyles.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/helpers/typeStyles.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "typeStyles.ts" is not allowed in src/helpers/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/helpers/typeStyles.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 13. src/prompts

**Issue**: Anti-pattern detected

**Current Location**: `src/prompts`

**Expected Location**: `Move to appropriate subfolder (app, components, lib, hooks, stores, types)`

**Reason**: Folder "prompts" is not allowed in src/. (Strict mode: only explicitly allowed items permitted) Allowed folders: app, components, hooks, lib, stores, types

**Action Required**:
- Refactor or relocate `src/prompts`
- Follow the pattern: Move to appropriate subfolder (app, components, lib, hooks, stores, types)
- Update imports and references

---

### 14. src/prompts/annette-analysis-prompt.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/prompts/annette-analysis-prompt.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "annette-analysis-prompt.ts" is not allowed in src/prompts/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/prompts/annette-analysis-prompt.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 15. src/prompts/annette-project-metadata.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/prompts/annette-project-metadata.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "annette-project-metadata.ts" is not allowed in src/prompts/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/prompts/annette-project-metadata.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 16. src/prompts/annette-style.md

**Issue**: Anti-pattern detected

**Current Location**: `src/prompts/annette-style.md`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "annette-style.md" is not allowed in src/prompts/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/prompts/annette-style.md`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 17. src/prompts/annette-system-prompt.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/prompts/annette-system-prompt.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "annette-system-prompt.ts" is not allowed in src/prompts/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/prompts/annette-system-prompt.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 18. src/prompts/annette-tool-definitions.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/prompts/annette-tool-definitions.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "annette-tool-definitions.ts" is not allowed in src/prompts/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/prompts/annette-tool-definitions.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 19. src/prompts/build-error-fixer-prompt.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/prompts/build-error-fixer-prompt.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "build-error-fixer-prompt.ts" is not allowed in src/prompts/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/prompts/build-error-fixer-prompt.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 20. src/prompts/file-scanner-prompt.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/prompts/file-scanner-prompt.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "file-scanner-prompt.ts" is not allowed in src/prompts/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/prompts/file-scanner-prompt.ts`
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
