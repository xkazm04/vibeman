# File Selection Decision System

**Version:** 2.0
**Last Updated:** 2025-01-16

This guide explains how to use the file selection decision components for Blueprint scans that require user selection from a list of files.

---

## Overview

The File Selection system provides a robust, reusable UI for allowing users to select specific actions for multiple files before accepting a decision. This is useful for scans that detect issues or opportunities across many files and need user input on how to proceed with each one.

### Components

1. **`FileSelectionGrid`** - Low-level grid component for file selection UI
2. **`UnusedFileDecision`** - High-level decision component with state management
3. **`DecisionPanel`** - Enhanced to support custom content with embedded actions
4. **`WizardStepPanel`** - Updated with scrollable custom content support

---

## Quick Start

### Step 1: Use UnusedFileDecision Component

The simplest way to add file selection to your scan:

```typescript
import React from 'react';
import UnusedFileDecision from '../components/UnusedFileDecision';

export function buildDecisionData(result: ScanResult): DecisionData {
  const files = result.files; // Your file list

  const customContent = React.createElement(UnusedFileDecision, {
    unusedFiles: files,
    stats: result.stats,
    projectPath: activeProject.path,
    onComplete: async (cleanFiles, integrateFiles) => {
      // Handle user selections
      console.log('Files to delete:', cleanFiles);
      console.log('Files to integrate:', integrateFiles);

      // Create requirements or perform actions
      await createCleanupRequirement(cleanFiles);
      await createIntegrationRequirement(integrateFiles);
    },
  });

  return {
    type: 'my-scan-selection',
    title: 'Select Actions for Files',
    description: 'Brief instructions here...',
    customContent,
    // onAccept/onReject handled by UnusedFileDecision
    onAccept: async () => {},
    onReject: async () => {},
  };
}
```

---

## Component Reference

### FileSelectionGrid

**Purpose:** Low-level component for rendering a grid of files with action buttons.

**Props:**
```typescript
interface FileSelectionGridProps {
  files: FileSelectionItem[];
  onSelectionChange?: (selections: Record<string, string>) => void;
  className?: string;
  testId?: string;
}

interface FileSelectionItem {
  id: string;
  filePath: string;
  relativePath: string;
  exports?: string[];
  reason?: string;
  metadata?: Record<string, any>;
}
```

**Features:**
- Three default actions: Delete, Integrate, Skip
- Real-time statistics (Unassigned/Delete/Integrate/Skip)
- Color-coded indicators (red/green/gray)
- Scrollable grid with max-height
- Blueprint design styling

**Usage:**
```typescript
<FileSelectionGrid
  files={fileItems}
  onSelectionChange={(selections) => {
    console.log('Selections:', selections);
    // selections = { 'file-0': 'clean', 'file-1': 'integrate', ... }
  }}
  testId="my-file-selection"
/>
```

---

### UnusedFileDecision

**Purpose:** High-level decision component with state management and action buttons.

**Props:**
```typescript
interface UnusedFileDecisionProps {
  unusedFiles: UnusedFile[];
  stats?: {
    totalFiles: number;
    totalExports: number;
    unusedExports: number;
  };
  projectPath: string;
  onComplete?: (cleanFiles: UnusedFile[], integrateFiles: UnusedFile[]) => Promise<void>;
}
```

**Features:**
- Automatic state management (no external state needed)
- Built-in Accept/Cancel buttons
- Validation (requires at least one selection)
- Statistics summary dashboard
- Action summary before submission
- Integrates with decision queue system

**Usage:**
```typescript
const customContent = React.createElement(UnusedFileDecision, {
  unusedFiles: [
    {
      filePath: '/full/path/to/file.tsx',
      relativePath: 'src/components/Unused.tsx',
      exports: ['UnusedComponent'],
      reason: 'No imports found',
    },
  ],
  stats: {
    totalFiles: 100,
    totalExports: 120,
    unusedExports: 15,
  },
  projectPath: '/project/path',
  onComplete: async (cleanFiles, integrateFiles) => {
    // Process selections
  },
});
```

---

## Architecture

### State Management Flow

```
User clicks action button
      ↓
FileSelectionGrid updates internal state
      ↓
Calls onSelectionChange callback
      ↓
UnusedFileDecision receives updated selections
      ↓
User clicks "Create Requirements"
      ↓
UnusedFileDecision.handleAccept()
      ↓
Filters files by action (clean/integrate/skip)
      ↓
Calls onComplete(cleanFiles, integrateFiles)
      ↓
Parent creates requirements/artifacts
      ↓
Decision accepted & removed from queue
```

### Decision Queue Integration

The `UnusedFileDecision` component integrates with the decision queue system:

1. **Uses `useDecisionQueueStore`** to access `acceptDecision()` and `rejectDecision()`
2. **Bypasses default handlers** by providing empty `onAccept`/`onReject` in decision data
3. **Custom buttons** in UnusedFileDecision call the queue methods directly
4. **DecisionPanel detects** `customContent` and hides default action buttons

---

## Customizing Actions

### Changing Action Types

To customize the available actions, modify `FileSelectionGrid.tsx`:

```typescript
const CUSTOM_ACTIONS: FileSelectionAction[] = [
  {
    id: 'fix',
    label: 'Fix',
    icon: Wrench,
    color: 'blue',
    description: 'Auto-fix this issue',
  },
  {
    id: 'ignore',
    label: 'Ignore',
    icon: EyeOff,
    color: 'gray',
    description: 'Ignore this issue',
  },
  {
    id: 'review',
    label: 'Review',
    icon: Eye,
    color: 'amber',
    description: 'Mark for manual review',
  },
];
```

Then update `UnusedFileDecision.handleAccept()` to process the new actions:

```typescript
const handleAccept = async () => {
  const fixFiles = unusedFiles.filter((_, i) => selections[`file-${i}`] === 'fix');
  const reviewFiles = unusedFiles.filter((_, i) => selections[`file-${i}`] === 'review');

  await onComplete?.(fixFiles, reviewFiles);
};
```

---

## Styling & Design

### Blueprint Design Principles

The file selection components follow the **Compact UI Design** guidelines:

✅ **Implemented:**
- Grid patterns with blueprint aesthetics
- Cyan/blue accent colors
- Illuminated button effects on hover
- Hand-written typography (font-mono)
- Framer Motion animations
- Compact spacing scale
- `data-testid` attributes for testing

### Color Scheme

| Action | Background | Border | Text |
|--------|-----------|--------|------|
| Delete | `bg-red-500/20` | `border-red-500/50` | `text-red-400` |
| Integrate | `bg-green-500/20` | `border-green-500/50` | `text-green-400` |
| Skip | `bg-gray-500/20` | `border-gray-500/50` | `text-gray-400` |
| Unassigned | `bg-gray-800/50` | `border-gray-600/50` | `text-gray-400` |

---

## Example: Creating a Custom Scan with File Selection

Let's create a "Duplicate Code" scan that allows users to select which duplicates to merge or keep:

### 1. Create Scan Implementation

```typescript
// lib/blueprintDuplicateScan.ts
import React from 'react';
import UnusedFileDecision from '../components/UnusedFileDecision';

export async function executeDuplicateScan(): Promise<ScanResult> {
  // Scan logic here
  const duplicates = await detectDuplicates();

  return {
    success: true,
    unusedFiles: duplicates.map(dup => ({
      filePath: dup.path,
      relativePath: dup.relativePath,
      exports: dup.functions,
      reason: `Duplicate of ${dup.originalFile}`,
    })),
    stats: {
      totalFiles: duplicates.length,
      totalExports: duplicates.reduce((sum, d) => sum + d.functions.length, 0),
      unusedExports: duplicates.length,
    },
  };
}

export function buildDecisionData(result: ScanResult): DecisionData {
  const customContent = React.createElement(UnusedFileDecision, {
    unusedFiles: result.unusedFiles,
    stats: result.stats,
    projectPath: activeProject.path,
    onComplete: async (mergeFiles, keepFiles) => {
      // Create merge requirement
      if (mergeFiles.length > 0) {
        await createMergeRequirement(mergeFiles);
      }

      // Create documentation for kept files
      if (keepFiles.length > 0) {
        await documentKeptDuplicates(keepFiles);
      }
    },
  });

  return {
    type: 'duplicate-scan-selection',
    title: 'Duplicate Code Detected',
    description: 'Select how to handle each duplicate...',
    customContent,
    onAccept: async () => {},
    onReject: async () => {},
  };
}
```

### 2. Register Scan in stepperConfig

```typescript
// lib/stepperConfig.ts
{
  id: 'duplicates',
  label: 'Duplicates',
  icon: Copy,
  color: 'amber',
  description: 'Find duplicate code',
  eventTitle: 'Duplicate Scan Completed',
}
```

### 3. Add to scanHandler

```typescript
// lib/blueprint-scan/scanHandler.ts
} else if (scanId === 'duplicates') {
  const { executeDuplicateScan } = await import('../blueprintDuplicateScan');
  result = await executeDuplicateScan();
}

// And in buildDecision section:
} else if (scanId === 'duplicates') {
  const { buildDecisionData } = await import('../blueprintDuplicateScan');
  decisionData = buildDecisionData(result);
}
```

Done! Your scan now has a full file selection UI.

---

## Testing

### Required Test IDs

The file selection components provide these test IDs:

**FileSelectionGrid:**
- `{testId}` - Root container
- `{testId}-files` - File list container
- `{testId}-file-{index}` - Individual file row
- `{testId}-file-{index}-action-{actionId}` - Action button

**UnusedFileDecision:**
- `unused-file-decision` - Root container
- `unused-files-selection-grid` - Grid component
- `unused-files-accept-btn` - Accept button
- `unused-files-reject-btn` - Cancel button

### Example Test

```typescript
it('should allow user to select actions for files', () => {
  render(<UnusedFileDecision unusedFiles={mockFiles} {...props} />);

  // Select delete for first file
  const deleteBtn = screen.getByTestId('unused-files-selection-grid-file-0-action-clean');
  fireEvent.click(deleteBtn);

  // Verify selection reflected in stats
  expect(screen.getByText('1 to Delete')).toBeInTheDocument();

  // Submit
  const acceptBtn = screen.getByTestId('unused-files-accept-btn');
  fireEvent.click(acceptBtn);

  // Verify onComplete called with correct files
  expect(mockOnComplete).toHaveBeenCalledWith([mockFiles[0]], []);
});
```

---

## Troubleshooting

### Issue: Selections not captured

**Problem:** When user clicks Accept, selections are empty.

**Solution:** Ensure you're using `UnusedFileDecision` which manages state internally, not `FileSelectionGrid` directly in decision data.

### Issue: Buttons not showing

**Problem:** Default Accept/Reject buttons show instead of custom buttons.

**Solution:** Verify `customContent` is set and `DecisionPanel` detects it:

```typescript
const hasCustomContent = !!currentDecision.customContent;
```

### Issue: Scrolling not working

**Problem:** Long file list overflows panel.

**Solution:** Ensure `WizardStepPanel` has proper flex layout:

```typescript
<div className="flex-1 min-w-0 flex flex-col max-h-[calc(100vh-12rem)]">
  <div className="mt-4 flex-1 overflow-y-auto min-h-0">
    {customContent}
  </div>
</div>
```

---

## Summary

The File Selection Decision System provides:

✅ Reusable components for file-based decisions
✅ Proper state management with hooks
✅ Integration with decision queue system
✅ Blueprint design compliance
✅ Scrollable UI for long file lists
✅ Customizable actions
✅ Full test coverage support

Use `UnusedFileDecision` for most cases. Only use `FileSelectionGrid` directly if you need custom state management.

**Next Steps:**
- See `SCAN_DEVELOPMENT_GUIDE.md` for general scan development
- Review `unusedCleanup.ts` and `unusedIntegration.ts` for prompt examples
- Check `blueprintUnusedScan.ts` for complete implementation reference
