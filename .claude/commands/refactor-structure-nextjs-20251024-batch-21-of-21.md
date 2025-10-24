# Structure Refactoring (Batch 21/21)

## Project Type: Next.js 15 (App Router)

## Overview

This requirement addresses structural violations detected in the codebase. Following proper project structure improves:
- **Code Organization**: Easier to find and maintain files
- **Developer Experience**: Predictable locations for different types of code
- **Scalability**: Clear patterns for adding new features
- **Team Collaboration**: Consistent structure across the team

## Structure Violations Detected


### 1. src/prompts/index.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/prompts/index.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "index.ts" is not allowed in src/prompts/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/prompts/index.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 2. src/services

**Issue**: Anti-pattern detected

**Current Location**: `src/services`

**Expected Location**: `Move to appropriate subfolder (app, components, lib, hooks, stores, types)`

**Reason**: Folder "services" is not allowed in src/. (Strict mode: only explicitly allowed items permitted) Allowed folders: app, components, hooks, lib, stores, types

**Action Required**:
- Refactor or relocate `src/services`
- Follow the pattern: Move to appropriate subfolder (app, components, lib, hooks, stores, types)
- Update imports and references

---

### 3. src/services/fileService.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/services/fileService.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "fileService.ts" is not allowed in src/services/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/services/fileService.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 4. src/utils

**Issue**: Anti-pattern detected

**Current Location**: `src/utils`

**Expected Location**: `Move to appropriate subfolder (app, components, lib, hooks, stores, types)`

**Reason**: Folder "utils" is not allowed in src/. (Strict mode: only explicitly allowed items permitted) Allowed folders: app, components, hooks, lib, stores, types

**Action Required**:
- Refactor or relocate `src/utils`
- Follow the pattern: Move to appropriate subfolder (app, components, lib, hooks, stores, types)
- Update imports and references

---

### 5. src/utils/pathUtils.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/utils/pathUtils.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "pathUtils.ts" is not allowed in src/utils/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/utils/pathUtils.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 6. src/utils/plantumlEncoder.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/utils/plantumlEncoder.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "plantumlEncoder.ts" is not allowed in src/utils/. (Strict mode: only explicitly allowed items permitted) No files allowed

**Action Required**:
- Refactor or relocate `src/utils/plantumlEncoder.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 7. src/utils/pathUtils.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/utils/pathUtils.ts`

**Expected Location**: `src/lib/`

**Reason**: Utils directory

**Action Required**:
- Refactor or relocate `src/utils/pathUtils.ts`
- Follow the pattern: src/lib/
- Update imports and references

---

### 8. src/utils/plantumlEncoder.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/utils/plantumlEncoder.ts`

**Expected Location**: `src/lib/`

**Reason**: Utils directory

**Action Required**:
- Refactor or relocate `src/utils/plantumlEncoder.ts`
- Follow the pattern: src/lib/
- Update imports and references

---

### 9. src/helpers/pathValidation.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/helpers/pathValidation.ts`

**Expected Location**: `src/lib/`

**Reason**: Helpers directory

**Action Required**:
- Refactor or relocate `src/helpers/pathValidation.ts`
- Follow the pattern: src/lib/
- Update imports and references

---

### 10. src/helpers/timelineStyles.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/helpers/timelineStyles.tsx`

**Expected Location**: `src/lib/`

**Reason**: Helpers directory

**Action Required**:
- Refactor or relocate `src/helpers/timelineStyles.tsx`
- Follow the pattern: src/lib/
- Update imports and references

---

### 11. src/helpers/typeStyles.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/helpers/typeStyles.ts`

**Expected Location**: `src/lib/`

**Reason**: Helpers directory

**Action Required**:
- Refactor or relocate `src/helpers/typeStyles.ts`
- Follow the pattern: src/lib/
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

✅ All 11 violations in this batch are resolved
✅ All imports are updated and working
✅ Application builds without errors
✅ No broken functionality

## Project Path

`C:\Users\kazda\kiro\vibeman`

Begin refactoring now. Work through each violation systematically.
