# Structure Refactoring (Batch 1/1)

## Project Type: Next.js 15 (App Router)

## Overview

This requirement addresses structural violations detected in the codebase. Following proper project structure improves:
- **Code Organization**: Easier to find and maintain files
- **Developer Experience**: Predictable locations for different types of code
- **Scalability**: Clear patterns for adding new features
- **Team Collaboration**: Consistent structure across the team

## Structure Violations Detected


### 1. src/utils/pathUtils.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/utils/pathUtils.ts`

**Expected Location**: `src/lib/pathUtils.ts`

**Reason**: Use src/lib/ instead of src/utils/ for consistency

**Action Required**:
- Refactor or relocate `src/utils/pathUtils.ts`
- Follow the pattern: src/lib/pathUtils.ts
- Update imports and references

---

### 2. src/utils/plantumlEncoder.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/utils/plantumlEncoder.ts`

**Expected Location**: `src/lib/plantumlEncoder.ts`

**Reason**: Use src/lib/ instead of src/utils/ for consistency

**Action Required**:
- Refactor or relocate `src/utils/plantumlEncoder.ts`
- Follow the pattern: src/lib/plantumlEncoder.ts
- Update imports and references

---

### 3. src/helpers/pathValidation.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/helpers/pathValidation.ts`

**Expected Location**: `src/lib/pathValidation.ts`

**Reason**: Use src/lib/ instead of src/helpers/ for consistency

**Action Required**:
- Refactor or relocate `src/helpers/pathValidation.ts`
- Follow the pattern: src/lib/pathValidation.ts
- Update imports and references

---

### 4. src/helpers/timelineStyles.tsx

**Issue**: Anti-pattern detected

**Current Location**: `src/helpers/timelineStyles.tsx`

**Expected Location**: `src/lib/timelineStyles.tsx`

**Reason**: Use src/lib/ instead of src/helpers/ for consistency

**Action Required**:
- Refactor or relocate `src/helpers/timelineStyles.tsx`
- Follow the pattern: src/lib/timelineStyles.tsx
- Update imports and references

---

### 5. src/helpers/typeStyles.ts

**Issue**: Anti-pattern detected

**Current Location**: `src/helpers/typeStyles.ts`

**Expected Location**: `src/lib/typeStyles.ts`

**Reason**: Use src/lib/ instead of src/helpers/ for consistency

**Action Required**:
- Refactor or relocate `src/helpers/typeStyles.ts`
- Follow the pattern: src/lib/typeStyles.ts
- Update imports and references


## General Structure Guidelines for Next.js


### Next.js 15 App Router Structure

**Core Directories:**
- `src/app/` - Pages, layouts, and route handlers (App Router)
- `src/app/api/` - API routes (route.ts files)
- `src/app/[feature]/` - Feature-specific pages and components
- `src/components/` - Shared/reusable components only
- `src/lib/` - Business logic, utilities, services
- `src/stores/` - Zustand state management
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions
- `src/lib/queries/` - Database query functions

**Key Principles:**
1. **Feature Co-location**: Keep feature-specific components in their feature folders (e.g., `src/app/goals/GoalsList.tsx`)
2. **Shared Components**: Only put truly reusable components in `src/components/`
3. **App Router Only**: Use `src/app/` not `src/pages/` (Pages Router is legacy)
4. **Consistent Naming**: Use `src/lib/` for all utilities (not utils/, helpers/, etc.)
5. **API Routes**: Follow Next.js conventions with route.ts files


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

✅ All 5 violations in this batch are resolved
✅ All imports are updated and working
✅ Application builds without errors
✅ No broken functionality

## Project Path

`C:/Users/kazda/kiro/vibeman`

Begin refactoring now. Work through each violation systematically.
