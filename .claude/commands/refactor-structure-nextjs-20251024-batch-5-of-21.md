# Structure Refactoring (Batch 5/21)

## Project Type: Next.js 15 (App Router)

## Overview

This requirement addresses structural violations detected in the codebase. Following proper project structure improves:
- **Code Organization**: Easier to find and maintain files
- **Developer Experience**: Predictable locations for different types of code
- **Scalability**: Clear patterns for adding new features
- **Team Collaboration**: Consistent structure across the team

## Structure Violations Detected


### 1. src/app/Claude/lib/generateRequirementsFromGoals.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/Claude/lib/generateRequirementsFromGoals.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "generateRequirementsFromGoals.ts" is not allowed in src/app/Claude/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/Claude/lib/generateRequirementsFromGoals.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 2. src/app/Claude/lib/index.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/Claude/lib/index.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "index.ts" is not allowed in src/app/Claude/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/Claude/lib/index.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 3. src/app/Claude/lib/requirementApi.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/Claude/lib/requirementApi.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "requirementApi.ts" is not allowed in src/app/Claude/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/Claude/lib/requirementApi.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 4. src/app/Claude/lib/requirementHandlers.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/Claude/lib/requirementHandlers.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "requirementHandlers.ts" is not allowed in src/app/Claude/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/Claude/lib/requirementHandlers.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 5. src/app/Claude/lib/requirementPrompts.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/Claude/lib/requirementPrompts.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "requirementPrompts.ts" is not allowed in src/app/Claude/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/Claude/lib/requirementPrompts.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 6. src/app/Claude/lib/requirementUtils.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/Claude/lib/requirementUtils.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "requirementUtils.ts" is not allowed in src/app/Claude/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/Claude/lib/requirementUtils.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 7. src/app/Claude/lib/structureScanManager.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/Claude/lib/structureScanManager.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "structureScanManager.ts" is not allowed in src/app/Claude/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/Claude/lib/structureScanManager.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 8. src/app/coder

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder`

**Expected Location**: `Rename to coder-page/ or move to src/app/features/`

**Reason**: Folder "coder" is not allowed in src/app/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/coder`
- Follow the pattern: Rename to coder-page/ or move to src/app/features/
- Update imports and references

---

### 9. src/app/coder/CoderLayout.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/CoderLayout.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "CoderLayout.tsx" is not allowed in src/app/coder/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/CoderLayout.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 10. src/app/coder/CodeTree

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/CodeTree`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "CodeTree" is not allowed in src/app/coder/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/coder/CodeTree`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 11. src/app/coder/CodeTree/CodePreviewModal.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/CodeTree/CodePreviewModal.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "CodePreviewModal.tsx" is not allowed in src/app/coder/CodeTree/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/CodeTree/CodePreviewModal.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 12. src/app/coder/CodeTree/FILE_STRUCTURE.md

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/CodeTree/FILE_STRUCTURE.md`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "FILE_STRUCTURE.md" is not allowed in src/app/coder/CodeTree/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/CodeTree/FILE_STRUCTURE.md`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 13. src/app/coder/CodeTree/lib

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/CodeTree/lib`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "lib" is not allowed in src/app/coder/CodeTree/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/coder/CodeTree/lib`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 14. src/app/coder/CodeTree/lib/hooks.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/CodeTree/lib/hooks.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "hooks.ts" is not allowed in src/app/coder/CodeTree/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/CodeTree/lib/hooks.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 15. src/app/coder/CodeTree/lib/index.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/CodeTree/lib/index.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "index.ts" is not allowed in src/app/coder/CodeTree/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/CodeTree/lib/index.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 16. src/app/coder/CodeTree/lib/projectApi.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/CodeTree/lib/projectApi.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "projectApi.ts" is not allowed in src/app/coder/CodeTree/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/CodeTree/lib/projectApi.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 17. src/app/coder/CodeTree/lib/treeUtils.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/CodeTree/lib/treeUtils.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "treeUtils.ts" is not allowed in src/app/coder/CodeTree/lib/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/CodeTree/lib/treeUtils.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 18. src/app/coder/CodeTree/TreeFooter.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/CodeTree/TreeFooter.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "TreeFooter.tsx" is not allowed in src/app/coder/CodeTree/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/CodeTree/TreeFooter.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 19. src/app/coder/CodeTree/TreeHeader.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/CodeTree/TreeHeader.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "TreeHeader.tsx" is not allowed in src/app/coder/CodeTree/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/CodeTree/TreeHeader.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 20. src/app/coder/CodeTree/TreeLayout.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/CodeTree/TreeLayout.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "TreeLayout.tsx" is not allowed in src/app/coder/CodeTree/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/CodeTree/TreeLayout.tsx`
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
