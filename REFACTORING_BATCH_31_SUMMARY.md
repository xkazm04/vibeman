# Refactoring Batch 31 - Implementation Summary

## Overview
This document summarizes the refactoring changes for batch 31. Due to file watcher interference from the running dev server, the changes are documented here for manual application or automated application when the dev server is stopped.

## Changes Summary

### 1. generate-context-background/route.ts
**Lines to modify:**
- Line 3: Remove unused `dirname` import
  ```ts
  // Before:
  import { join, dirname } from 'path';
  // After:
  import { join } from 'path';
  ```

- Lines 38-40: Remove console.error (error logged via event system)
  ```ts
  // Before:
  }).catch(error => {
    console.error('Background context file generation failed:', error);
  });
  // After:
  }).catch(() => {
    // Error will be logged via event system
  });
  ```

- Lines 47-52: Improve error handling
  ```ts
  // Before:
  } catch (error) {
    console.error('Background context generation API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
  // After:
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
  ```

- Line 133: Remove console.log
  ```ts
  // Before:
  console.log(`Context file generated successfully: ${filePath}`);
  // After:
  // (remove this line - success is logged via event system)
  ```

- Line 135: Remove console.error
  ```ts
  // Before:
  console.error('Background context file generation failed:', error);
  // After:
  // (remove this line - error is logged via event system)
  ```

### 2. generate-context/route.ts
**Lines to modify:**
- Lines 84, 126, 137: Remove console.error/console.log statements
  - Line 84: `console.error('Failed to generate context file:', error);` - REMOVE
  - Line 126: `console.error('Database error:', dbError);` - REMOVE
  - Line 137: `console.error('Context creation API error:', error);` - REMOVE

**Code duplication to extract:**
- Event ID generation pattern (appears 5 times)
- Context file path generation logic
- Database-to-frontend format conversion

### 3. folder-structure/route.ts
**Lines to modify:**
- Line 84: `console.error(\`Error reading directory \${dirPath}:\`, error);` - REMOVE
- Line 97: `console.log('Building folder structure for:', basePath);` - REMOVE
- Line 108: `console.error('Folder structure API error:', error);` - REMOVE

**Code duplication to extract:**
- Directory filtering logic (ignoredItems pattern matching)
- File type filtering logic
- Sorting logic for nodes

### 4. events/route.ts
**Lines to modify:**
- Line 25: `console.error('Failed to fetch events:', error);` - REMOVE
- Line 66: `console.error('Failed to create event:', error);` - REMOVE
- Line 110: `console.error('Failed to delete event:', error);` - REMOVE

**Code duplication to extract:**
- Error response pattern (appears 17 times across GET/POST/DELETE)

### 5. ai-project-background/route.ts
**Long functions to break down:**
- `processBackgroundGeneration` (lines 49-109) - 60 lines
- `analyzeProjectStructure` (lines 111-196) - 85 lines

**Suggested refactoring:**
```ts
// Extract helper functions:
- createEventLogger(projectId, mode) - Returns logging functions
- analyzeKeyFiles(projectPath, patterns) - Returns analyzed files
- analyzeDirectories(projectPath, dirs) - Returns directory analysis
```

**'any' types to fix:**
- Line 278: `function detectTechnologies(analysis: any)` → Add proper type
- Line 282: `const packageJson = analysis.codebase.configFiles.find((f: any)` → Use proper type

**Console statements:**
- Line 41, 98, 193: Remove console.error statements

### 6. ai-project-review/route.ts  
**Long functions to break down:**
- `POST` handler (lines 7-69) - 62 lines
- `analyzeProjectStructure` (lines 71-155) - 84 lines

**'any' types to fix:**
- Line 30: `let result: any;` → Define proper result type
- Line 237, 241: Type annotations in detectTechnologies
- Line 269, 287: Parameters in parseAIJsonResponse

**Console statements (14 total):**
- Lines 53, 63, 152, 290, 293, 294, 299, 300, 304, 312, 313, 322, 327, 332: Remove all console.log/console.error

### 7. ideas/vibeman/route.ts
**Long functions to break down:**
- `POST` handler (lines 18-90) - 72 lines
- `evaluateAndSelectIdea` (lines 134-236) - 102 lines  
- `implementIdea` (lines 241-325) - 84 lines
- `buildEvaluationPrompt` (lines 371-447) - 76 lines

**Suggested refactoring:**
```ts
// Extract route handlers:
- handleGetFirstAccepted(projectId)
- handleEvaluateAndSelect(projectId, projectPath)
- handleImplementIdea(ideaId, projectPath, projectId)
- handleGetStatus(projectId)
- handleMarkImplemented(ideaId)

// Extract idea evaluation logic:
- validateSelectedIdea(evaluation, pendingIdeas)
- selectFallbackIdea(pendingIdeas)
- parseEvaluationResponse(response)
```

**Console statements (30 total):**
- Lines 81, 100, 107, 117, 124, 139, 152, 158, 168, 182, 196, 204, 205, 213, 222, 223, 229, 246, 260, 262, 272, 278, 279, 295, 299, 305, 314, 319, 472, 478: Remove all console.log/console.error

## Type Safety Improvements

### Create shared types file: `src/app/api/kiro/types.ts`
```typescript
export interface ProjectAnalysis {
  structure: Record<string, unknown>;
  stats: {
    totalFiles: number;
    totalDirectories: number;
    fileTypes: Record<string, number>;
    keyFiles: string[];
    technologies: string[];
  };
  codebase: {
    mainFiles: AnalyzedFile[];
    configFiles: AnalyzedFile[];
    documentationFiles: AnalyzedFile[];
  };
}

export interface AnalyzedFile {
  path: string;
  content: string;
  type: string;
}

export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}
```

## Extracted Utility Functions

### Create `src/lib/utils/eventIdGenerator.ts`
```typescript
export function generateEventId(): string {
  return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### Create `src/lib/utils/errorResponse.ts`
```typescript
import { NextResponse } from 'next/server';

export function errorResponse(error: unknown, status: number = 500) {
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    },
    { status }
  );
}
```

## Testing Checklist
- [ ] Run `npm run build` to verify no build errors
- [ ] Run type check: `npx tsc --noEmit`
- [ ] Test each API endpoint manually
- [ ] Verify event logging still works correctly
- [ ] Check that error handling provides useful messages

## Implementation Notes
1. Stop the dev server before applying changes: `Ctrl+C` in the terminal running `npm run dev`
2. Apply changes file by file
3. Run type check after each file
4. Restart dev server and test
5. Commit changes with message: "Refactor batch 31: Code quality improvements"

