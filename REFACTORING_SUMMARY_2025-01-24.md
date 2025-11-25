# Scan Techniques Refactoring - January 24, 2025

## Overview

Refactored the scan system to separate patterns from techniques, making individual checks reusable across the codebase.

## Changes Made

### 1. Created Modular Pattern Detectors (`src/lib/scan/patterns/`)

Split `src/app/features/RefactorWizard/lib/patternDetectors.ts` into logical modules:

- **`duplication.ts`** - Code duplication detection (single-file and cross-file)
- **`functions.ts`** - Long functions, cyclomatic complexity
- **`code-quality.ts`** - Console statements, 'any' types, unused imports
- **`conditionals.ts`** - Complex boolean expressions, deep nesting
- **`constants.ts`** - Magic numbers detection
- **`react-hooks.ts`** - React Hook dependency issues
- **`index.ts`** - Barrel export for all patterns

**Benefits:**
- Each pattern detector is self-contained
- Easy to import individual detectors
- Can be reused in other parts of the codebase

### 2. Created Technique Modules (`src/lib/scan/techniques/nextjs/`)

Extracted check methods from `NextJSScanStrategy` into individual technique files:

**Generic Code Quality Techniques:**
- `large-file.ts` - Detects files >200 lines
- `duplication.ts` - Uses `detectDuplication` pattern
- `long-functions.ts` - Uses `detectLongFunctions` pattern
- `console-statements.ts` - Uses `detectConsoleStatements` pattern (threshold: 3+)
- `any-types.ts` - Uses `detectAnyTypes` pattern (threshold: 3+)
- `unused-imports.ts` - Uses `detectUnusedImports` pattern
- `complex-conditionals.ts` - Uses `detectComplexConditionals` pattern
- `magic-numbers.ts` - Uses `detectMagicNumbers` pattern
- `react-hook-deps.ts` - Uses `detectReactHookDeps` pattern

**Next.js Specific Techniques:**
- `client-server-mixing.ts` - Detects 'use client' with server APIs
- `image-optimization.ts` - Detects <img> without next/image
- `dynamic-imports.ts` - Suggests code splitting for large components
- `metadata-api.ts` - Detects next/head in App Router

**Barrel Export:**
- `index.ts` - Exports all technique functions

**Benefits:**
- Each technique is a standalone function
- Can be imported and used anywhere (e.g., in custom scan scripts)
- Easy to add new techniques
- Easy to create technique collections for other frameworks (Express, FastAPI, etc.)

### 3. Updated Strategy Files

**NextJSScanStrategy.ts:**
- ✅ Removed all private check methods
- ✅ Imports technique functions from `@/lib/scan/techniques/nextjs`
- ✅ Simplified `detectOpportunities` to call technique functions
- ✅ Reduced file size from ~587 lines to ~168 lines

**ReactNativeScanStrategy.ts:**
- ✅ Updated imports from old patternDetectors to `@/lib/scan/patterns`

### 4. Fixed Import Paths

**refactorAnalyzer.ts:**
- ✅ Commented out non-existent OpportunityFilters import
- ✅ Simplified deduplication logic to use existing function

## New Structure

```
src/lib/scan/
├── patterns/                    # Pattern detection logic
│   ├── duplication.ts
│   ├── functions.ts
│   ├── code-quality.ts
│   ├── conditionals.ts
│   ├── constants.ts
│   ├── react-hooks.ts
│   └── index.ts
├── techniques/                  # Framework-specific check implementations
│   └── nextjs/
│       ├── large-file.ts
│       ├── duplication.ts
│       ├── long-functions.ts
│       ├── console-statements.ts
│       ├── any-types.ts
│       ├── unused-imports.ts
│       ├── complex-conditionals.ts
│       ├── magic-numbers.ts
│       ├── react-hook-deps.ts
│       ├── client-server-mixing.ts
│       ├── image-optimization.ts
│       ├── dynamic-imports.ts
│       ├── metadata-api.ts
│       └── index.ts
└── strategies/                  # Scan strategies (orchestrators)
    ├── NextJSScanStrategy.ts   # Now uses techniques
    └── ReactNativeScanStrategy.ts
```

## Usage Examples

### Using Individual Patterns

```typescript
import { detectDuplication, detectLongFunctions } from '@/lib/scan/patterns';

const duplicates = detectDuplication(fileContent);
const longFuncs = detectLongFunctions(fileContent);
```

### Using Individual Techniques

```typescript
import { checkConsoleStatements, checkAnyTypes } from '@/lib/scan/techniques/nextjs';

const opportunities: RefactorOpportunity[] = [];
checkConsoleStatements(fileAnalysis, opportunities);
checkAnyTypes(fileAnalysis, opportunities);
```

### Creating Custom Scan Scripts

```typescript
import { checkLargeFile, checkDuplication } from '@/lib/scan/techniques/nextjs';

// Custom scan for large files and duplication only
const opportunities: RefactorOpportunity[] = [];
files.forEach(file => {
  checkLargeFile(file, opportunities);
  checkDuplication(file, opportunities);
});
```

## Future Enhancements

### Create Techniques for Other Frameworks

The pattern is now established for adding new framework-specific techniques:

1. Create `src/lib/scan/techniques/express/` directory
2. Add technique files (e.g., `check-middleware.ts`, `check-routes.ts`)
3. Create barrel export `index.ts`
4. Update or create corresponding strategy

### Share Techniques Across Frameworks

Many techniques are framework-agnostic and can be reused:

```typescript
// Express strategy could import from nextjs techniques
import {
  checkLargeFile,
  checkDuplication,
  checkLongFunctions,
  checkConsoleStatements,
} from '@/lib/scan/techniques/nextjs';
```

Or create a shared techniques directory:

```typescript
// Future: src/lib/scan/techniques/shared/
import { checkLargeFile } from '@/lib/scan/techniques/shared';
```

## Benefits of This Refactoring

1. **Reusability**: Techniques can be used in:
   - Custom scan scripts
   - CLI tools
   - API endpoints
   - Background workers
   - Other scan strategies

2. **Maintainability**: Each technique is:
   - Self-contained in its own file
   - Easy to locate and modify
   - Easy to test in isolation

3. **Scalability**: Easy to add new:
   - Patterns (in `patterns/`)
   - Techniques (in `techniques/[framework]/`)
   - Frameworks (new directories in `techniques/`)

4. **Clarity**: Clear separation of concerns:
   - **Patterns** = Low-level detection logic
   - **Techniques** = Business logic + pattern usage
   - **Strategies** = Orchestration + file scanning

## Migration Notes

### For Developers

- **Old import path**: `@/app/features/RefactorWizard/lib/patternDetectors`
- **New import path**: `@/lib/scan/patterns`

### For New Techniques

To add a new technique:

1. Create file in `src/lib/scan/techniques/[framework]/my-technique.ts`
2. Export function with signature:
   ```typescript
   export function checkMyTechnique(
     file: FileAnalysis,
     opportunities: RefactorOpportunity[]
   ): void
   ```
3. Add export to `techniques/[framework]/index.ts`
4. Import and use in strategy's `detectOpportunities` method

## Testing

Type checking shows no new errors introduced by the refactoring. Pre-existing errors in the codebase remain (node_modules issues, Set iteration).

## Files Modified

- ✅ Created: `src/lib/scan/patterns/` (7 files)
- ✅ Created: `src/lib/scan/techniques/nextjs/` (14 files)
- ✅ Updated: `src/lib/scan/strategies/NextJSScanStrategy.ts`
- ✅ Updated: `src/lib/scan/strategies/ReactNativeScanStrategy.ts`
- ✅ Updated: `src/app/features/RefactorWizard/lib/refactorAnalyzer.ts`

**Total:** 23 new files created, 3 files updated
