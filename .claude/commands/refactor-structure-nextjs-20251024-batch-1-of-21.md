# Structure Refactoring (Batch 1/21)

## Project Type: Next.js 15 (App Router)

## Overview

This requirement addresses structural violations detected in the codebase. Following proper project structure improves:
- **Code Organization**: Easier to find and maintain files
- **Developer Experience**: Predictable locations for different types of code
- **Scalability**: Clear patterns for adding new features
- **Team Collaboration**: Consistent structure across the team

## Structure Violations Detected


### 1. data/prompts

**Issue**: Anti-pattern detected

**Current Location**: `data/prompts`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "data/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `data/prompts`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 2. data/prompts/analysis-task.txt

**Issue**: Anti-pattern detected

**Current Location**: `data/prompts/analysis-task.txt`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "data/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `data/prompts/analysis-task.txt`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 3. data/prompts/message-evaluation.txt

**Issue**: Anti-pattern detected

**Current Location**: `data/prompts/message-evaluation.txt`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "data/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `data/prompts/message-evaluation.txt`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 4. data/prompts/response-guidelines.txt

**Issue**: Anti-pattern detected

**Current Location**: `data/prompts/response-guidelines.txt`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "data/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `data/prompts/response-guidelines.txt`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 5. data/prompts/response-instructions.txt

**Issue**: Anti-pattern detected

**Current Location**: `data/prompts/response-instructions.txt`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "data/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `data/prompts/response-instructions.txt`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 6. docs/anette

**Issue**: Anti-pattern detected

**Current Location**: `docs/anette`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/anette`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 7. docs/anette/schema.sql

**Issue**: Anti-pattern detected

**Current Location**: `docs/anette/schema.sql`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/anette/schema.sql`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 8. docs/API_ENDPOINTS.md

**Issue**: Anti-pattern detected

**Current Location**: `docs/API_ENDPOINTS.md`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/API_ENDPOINTS.md`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 9. docs/CLAUDE_CODE_INTEGRATION.md

**Issue**: Anti-pattern detected

**Current Location**: `docs/CLAUDE_CODE_INTEGRATION.md`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/CLAUDE_CODE_INTEGRATION.md`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 10. docs/CONTEXT_AUTO_UPDATE.md

**Issue**: Anti-pattern detected

**Current Location**: `docs/CONTEXT_AUTO_UPDATE.md`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/CONTEXT_AUTO_UPDATE.md`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 11. docs/FINAL_POLISH_SUMMARY.md

**Issue**: Anti-pattern detected

**Current Location**: `docs/FINAL_POLISH_SUMMARY.md`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/FINAL_POLISH_SUMMARY.md`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 12. docs/IDEA_GENERATION_SYSTEM.md

**Issue**: Anti-pattern detected

**Current Location**: `docs/IDEA_GENERATION_SYSTEM.md`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/IDEA_GENERATION_SYSTEM.md`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 13. docs/LANGGRAPH_INTEGRATION_COMPLETE.md

**Issue**: Anti-pattern detected

**Current Location**: `docs/LANGGRAPH_INTEGRATION_COMPLETE.md`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/LANGGRAPH_INTEGRATION_COMPLETE.md`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 14. docs/LANGGRAPH_PROMPTS_GUIDE.md

**Issue**: Anti-pattern detected

**Current Location**: `docs/LANGGRAPH_PROMPTS_GUIDE.md`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/LANGGRAPH_PROMPTS_GUIDE.md`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 15. docs/LANGGRAPH_QUICKSTART.md

**Issue**: Anti-pattern detected

**Current Location**: `docs/LANGGRAPH_QUICKSTART.md`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/LANGGRAPH_QUICKSTART.md`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 16. docs/LANGGRAPH_QUICK_REFERENCE.md

**Issue**: Anti-pattern detected

**Current Location**: `docs/LANGGRAPH_QUICK_REFERENCE.md`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/LANGGRAPH_QUICK_REFERENCE.md`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 17. docs/LANGGRAPH_TOOLS.md

**Issue**: Anti-pattern detected

**Current Location**: `docs/LANGGRAPH_TOOLS.md`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/LANGGRAPH_TOOLS.md`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 18. docs/LANGGRAPH_TOOLS_IMPLEMENTATION.md

**Issue**: Anti-pattern detected

**Current Location**: `docs/LANGGRAPH_TOOLS_IMPLEMENTATION.md`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/LANGGRAPH_TOOLS_IMPLEMENTATION.md`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 19. docs/llm_tool_definitions.md

**Issue**: Anti-pattern detected

**Current Location**: `docs/llm_tool_definitions.md`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/llm_tool_definitions.md`
- Follow the pattern: Move to src/ or remove
- Update imports and references

---

### 20. docs/MONITORING_SYSTEM.md

**Issue**: Anti-pattern detected

**Current Location**: `docs/MONITORING_SYSTEM.md`

**Expected Location**: `Move to src/ or remove`

**Reason**: Item is in "docs/" which is not a standard Next.js folder. Expected structure has code in src/ folder. 

**Action Required**:
- Refactor or relocate `docs/MONITORING_SYSTEM.md`
- Follow the pattern: Move to src/ or remove
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
