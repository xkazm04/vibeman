# Structure Refactoring (Batch 11/21)

## Project Type: Next.js 15 (App Router)

## Overview

This requirement addresses structural violations detected in the codebase. Following proper project structure improves:
- **Code Organization**: Easier to find and maintain files
- **Developer Experience**: Predictable locations for different types of code
- **Scalability**: Clear patterns for adding new features
- **Team Collaboration**: Consistent structure across the team

## Structure Violations Detected


### 1. src/app/db/migrations

**Issue**: Anti-pattern detected

**Current Location**: `src/app/db/migrations`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "migrations" is not allowed in src/app/db/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/db/migrations`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 2. src/app/db/migrations/index.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/db/migrations/index.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "index.ts" is not allowed in src/app/db/migrations/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/db/migrations/index.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 3. src/app/db/models

**Issue**: Anti-pattern detected

**Current Location**: `src/app/db/models`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "models" is not allowed in src/app/db/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/db/models`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 4. src/app/db/models/types.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/db/models/types.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "types.ts" is not allowed in src/app/db/models/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/db/models/types.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 5. src/app/db/repositories

**Issue**: Anti-pattern detected

**Current Location**: `src/app/db/repositories`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "repositories" is not allowed in src/app/db/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/db/repositories`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 6. src/app/db/repositories/idea.repository.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/db/repositories/idea.repository.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "idea.repository.ts" is not allowed in src/app/db/repositories/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/db/repositories/idea.repository.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 7. src/app/db/repositories/scan.repository.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/db/repositories/scan.repository.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "scan.repository.ts" is not allowed in src/app/db/repositories/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/db/repositories/scan.repository.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 8. src/app/db/schema.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/app/db/schema.ts`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "schema.ts" is not allowed in src/app/db/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/db/schema.ts`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 9. src/app/db/{models,repositories,migrations}

**Issue**: Anti-pattern detected

**Current Location**: `src/app/db/{models,repositories,migrations}`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "{models,repositories,migrations}" is not allowed in src/app/db/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/db/{models,repositories,migrations}`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 10. src/app/features/footer-monitor

**Issue**: Anti-pattern detected

**Current Location**: `src/app/features/footer-monitor`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "footer-monitor" is not allowed in src/app/features/. (Strict mode: only explicitly allowed items permitted) Allowed folders: components, lib, sub_*

**Action Required**:
- Refactor or relocate `src/app/features/footer-monitor`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 11. src/app/features/footer-monitor/FooterBgTasks

**Issue**: Anti-pattern detected

**Current Location**: `src/app/features/footer-monitor/FooterBgTasks`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "FooterBgTasks" is not allowed in src/app/features/footer-monitor/. (Strict mode: only explicitly allowed items permitted) Allowed folders: components, lib, sub_*

**Action Required**:
- Refactor or relocate `src/app/features/footer-monitor/FooterBgTasks`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 12. src/app/features/footer-monitor/FooterEvents

**Issue**: Anti-pattern detected

**Current Location**: `src/app/features/footer-monitor/FooterEvents`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "FooterEvents" is not allowed in src/app/features/footer-monitor/. (Strict mode: only explicitly allowed items permitted) Allowed folders: components, lib, sub_*

**Action Required**:
- Refactor or relocate `src/app/features/footer-monitor/FooterEvents`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 13. src/app/features/Ideas

**Issue**: Anti-pattern detected

**Current Location**: `src/app/features/Ideas`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "Ideas" is not allowed in src/app/features/. (Strict mode: only explicitly allowed items permitted) Allowed folders: components, lib, sub_*

**Action Required**:
- Refactor or relocate `src/app/features/Ideas`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 14. src/app/features/ProjectManager

**Issue**: Anti-pattern detected

**Current Location**: `src/app/features/ProjectManager`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "ProjectManager" is not allowed in src/app/features/. (Strict mode: only explicitly allowed items permitted) Allowed folders: components, lib, sub_*

**Action Required**:
- Refactor or relocate `src/app/features/ProjectManager`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 15. src/app/features/Proposals

**Issue**: Anti-pattern detected

**Current Location**: `src/app/features/Proposals`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "Proposals" is not allowed in src/app/features/. (Strict mode: only explicitly allowed items permitted) Allowed folders: components, lib, sub_*

**Action Required**:
- Refactor or relocate `src/app/features/Proposals`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 16. src/app/ideas

**Issue**: Anti-pattern detected

**Current Location**: `src/app/ideas`

**Expected Location**: `Rename to ideas-page/ or move to src/app/features/`

**Reason**: Folder "ideas" is not allowed in src/app/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/ideas`
- Follow the pattern: Rename to ideas-page/ or move to src/app/features/
- Update imports and references

---

### 17. src/app/monitor

**Issue**: Anti-pattern detected

**Current Location**: `src/app/monitor`

**Expected Location**: `Rename to monitor-page/ or move to src/app/features/`

**Reason**: Folder "monitor" is not allowed in src/app/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/monitor`
- Follow the pattern: Rename to monitor-page/ or move to src/app/features/
- Update imports and references

---

### 18. src/app/monitor/components

**Issue**: Anti-pattern detected

**Current Location**: `src/app/monitor/components`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: Folder "components" is not allowed in src/app/monitor/. (Strict mode: only explicitly allowed items permitted) Allowed folders: api, features, *-page

**Action Required**:
- Refactor or relocate `src/app/monitor/components`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 19. src/app/monitor/components/MonitorCallsTable.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/monitor/components/MonitorCallsTable.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "MonitorCallsTable.tsx" is not allowed in src/app/monitor/components/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/monitor/components/MonitorCallsTable.tsx`
- Follow the pattern: Relocate or remove - see structure guidelines
- Update imports and references

---

### 20. src/app/monitor/components/MonitorPatternsTable.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/app/monitor/components/MonitorPatternsTable.tsx`

**Expected Location**: `Relocate or remove - see structure guidelines`

**Reason**: File "MonitorPatternsTable.tsx" is not allowed in src/app/monitor/components/. (Strict mode: only explicitly allowed items permitted) Allowed files: globals.css, favicon.ico, layout.tsx, page.tsx

**Action Required**:
- Refactor or relocate `src/app/monitor/components/MonitorPatternsTable.tsx`
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
