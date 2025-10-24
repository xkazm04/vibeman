# Structure Refactoring (Batch 8/21)

## Project Type: Next.js 15 (App Router)

## Overview

This requirement addresses structural violations detected in the codebase. Following proper project structure improves:
- **Code Organization**: Easier to find and maintain files
- **Developer Experience**: Predictable locations for different types of code
- **Scalability**: Clear patterns for adding new features
- **Team Collaboration**: Consistent structure across the team

## Structure Violations Detected


### 1. src/app/coder/Context/ContextGroups/ContextJailCard.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextGroups/ContextJailCard.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "ContextJailCard.tsx" is not allowed in src/app/coder/Context/ContextGroups/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextGroups/ContextJailCard.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 2. src/app/coder/Context/ContextGroups/ContextSection.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextGroups/ContextSection.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "ContextSection.tsx" is not allowed in src/app/coder/Context/ContextGroups/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextGroups/ContextSection.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 3. src/app/coder/Context/ContextGroups/ContextSectionContent.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextGroups/ContextSectionContent.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "ContextSectionContent.tsx" is not allowed in src/app/coder/Context/ContextGroups/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextGroups/ContextSectionContent.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 4. src/app/coder/Context/ContextGroups/ContextSectionEmpty.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextGroups/ContextSectionEmpty.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "ContextSectionEmpty.tsx" is not allowed in src/app/coder/Context/ContextGroups/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextGroups/ContextSectionEmpty.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 5. src/app/coder/Context/ContextGroups/ContextSectionHeader.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextGroups/ContextSectionHeader.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "ContextSectionHeader.tsx" is not allowed in src/app/coder/Context/ContextGroups/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextGroups/ContextSectionHeader.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 6. src/app/coder/Context/ContextGroups/HorizontalContextBarHeader.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextGroups/HorizontalContextBarHeader.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "HorizontalContextBarHeader.tsx" is not allowed in src/app/coder/Context/ContextGroups/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextGroups/HorizontalContextBarHeader.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 7. src/app/coder/Context/ContextGroups/index.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextGroups/index.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "index.ts" is not allowed in src/app/coder/Context/ContextGroups/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextGroups/index.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 8. src/app/coder/Context/ContextGroups/LazyContextCards.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextGroups/LazyContextCards.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "LazyContextCards.tsx" is not allowed in src/app/coder/Context/ContextGroups/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextGroups/LazyContextCards.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 9. src/app/coder/Context/ContextGroups/REFACTORING_NOTES.md

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextGroups/REFACTORING_NOTES.md`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "REFACTORING_NOTES.md" is not allowed in src/app/coder/Context/ContextGroups/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextGroups/REFACTORING_NOTES.md`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 10. src/app/coder/Context/ContextGroups/utils

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextGroups/utils`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "utils" is not allowed in src/app/coder/Context/ContextGroups/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextGroups/utils`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 11. src/app/coder/Context/ContextGroups/utils/performance.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextGroups/utils/performance.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "performance.ts" is not allowed in src/app/coder/Context/ContextGroups/utils/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextGroups/utils/performance.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 12. src/app/coder/Context/ContextList.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextList.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "ContextList.tsx" is not allowed in src/app/coder/Context/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextList.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 13. src/app/coder/Context/ContextMenu

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextMenu`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "ContextMenu" is not allowed in src/app/coder/Context/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextMenu`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 14. src/app/coder/Context/ContextMenu/ContextMenu.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextMenu/ContextMenu.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "ContextMenu.tsx" is not allowed in src/app/coder/Context/ContextMenu/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextMenu/ContextMenu.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 15. src/app/coder/Context/ContextMenu/ContextSaveModal.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextMenu/ContextSaveModal.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "ContextSaveModal.tsx" is not allowed in src/app/coder/Context/ContextMenu/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextMenu/ContextSaveModal.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 16. src/app/coder/Context/ContextMenu/FileTreeSelector.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextMenu/FileTreeSelector.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "FileTreeSelector.tsx" is not allowed in src/app/coder/Context/ContextMenu/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextMenu/FileTreeSelector.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 17. src/app/coder/Context/ContextMenu/SelectedFilesList.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextMenu/SelectedFilesList.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "SelectedFilesList.tsx" is not allowed in src/app/coder/Context/ContextMenu/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextMenu/SelectedFilesList.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 18. src/app/coder/Context/ContextOverview

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextOverview`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "ContextOverview" is not allowed in src/app/coder/Context/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextOverview`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 19. src/app/coder/Context/ContextOverview/AdvisorPanel.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextOverview/AdvisorPanel.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "AdvisorPanel.tsx" is not allowed in src/app/coder/Context/ContextOverview/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextOverview/AdvisorPanel.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 20. src/app/coder/Context/ContextOverview/advisorPrompts.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/coder/Context/ContextOverview/advisorPrompts.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "advisorPrompts.ts" is not allowed in src/app/coder/Context/ContextOverview/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/coder/Context/ContextOverview/advisorPrompts.ts`
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
