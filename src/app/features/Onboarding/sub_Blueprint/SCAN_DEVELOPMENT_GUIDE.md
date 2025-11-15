# Blueprint Scan Development Guide

> **Last Updated**: 2025-01-14
> **Version**: 2.0.0 - Simplified Architecture

This guide explains how to develop new scans for the Blueprint onboarding system. Blueprint is a modular scan orchestration framework that guides users through project analysis and setup using AI-powered scans.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start: Adding a New Scan](#quick-start-adding-a-new-scan)
3. [File Checklist](#file-checklist)
4. [Integration Points](#integration-points)
5. [Examples](#examples)
6. [Best Practices](#best-practices)

---

## Architecture Overview

### Simplified Configuration System (v2.0)

**As of v2.0, Blueprint uses a SINGLE source of truth for scan configuration.**

```
Blueprint System
├── Scan Implementation Layer
│   └── lib/blueprintXXXScan.ts         # Individual scan logic
│
├── Configuration Layer (SINGLE SOURCE OF TRUTH)
│   ├── lib/stepperConfig.ts            # ✅ Runtime scan configuration
│   ├── lib/defaultStateMachines.ts     # ⚠️ Separate feature: State machine editor
│   └── store/blueprintStore.ts         # Auto-generated from stepperConfig
│
├── Execution Layer
│   └── lib/blueprint-scan/scanHandler.ts # Dynamic scan loader
│
├── UI Components
│   ├── DarkBlueprintLayout.tsx          # Main orchestrator
│   ├── components/DecisionPanel.tsx     # Decision modal
│   └── components/ScanButtonsBar.tsx    # Scan buttons
│
└── API Layer
    └── api/blueprint/scans/[name]/route.ts # Server endpoints
```

### Core Files Explained

#### 1. **stepperConfig.ts** 🎯 **SINGLE SOURCE OF TRUTH**
- **Primary runtime configuration**
- Defines all available scans and their metadata
- Organized into technique groups by project type
- Auto-generates scan status in blueprintStore

**Example:**
```typescript
export const NEXTJS_TECHNIQUE_GROUPS: TechniqueGroup[] = [
  {
    id: 'nextjs-ui',
    techniques: [
      {
        id: 'photo',
        label: 'Photo',
        icon: Camera,
        color: 'pink',
        eventTitle: 'Photo Scan Completed',
        contextNeeded: true,
        description: 'Capture visual snapshots of components',
      }
    ]
  }
]
```

#### 2. **defaultStateMachines.ts** ⚠️ **SEPARATE FEATURE**
- **NOT used for runtime scan execution**
- Powers the StateMachineEditor component
- Defines onboarding flow states and transitions
- Includes scanHandler functions for complex workflows
- **Only needed if building state machine flows**

#### 3. **blueprintStore.ts** 🤖 **AUTO-GENERATED**
- Scan status tracking (isRunning, progress, lastRun)
- **Automatically generated** from stepperConfig
- No manual scan list maintenance required

#### 4. **scanHandler.ts** ⚙️ **DYNAMIC LOADER**
- Dynamically imports scan modules at runtime
- Uses stepperConfig to find scan metadata
- Handles scan execution and decision building

---

## Quick Start: Adding a New Scan

### Step-by-Step Guide (3 Simple Steps!)

#### ✅ **Step 1: Create Scan Implementation**

**File**: `lib/blueprintMyNewScan.ts`

```typescript
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useBlueprintStore } from '../store/blueprintStore';

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface DecisionData {
  type: string;
  title: string;
  description: string;
  severity?: 'info' | 'warning' | 'error';
  data?: any;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

/**
 * Execute your scan logic
 */
export async function executeMyNewScan(contextId?: string): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return { success: false, error: 'No active project selected' };
  }

  try {
    // Update progress during execution
    useBlueprintStore.getState().updateScanProgress(25);

    // Your scan logic here
    const result = await fetch('/api/blueprint/scans/mynewscan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: activeProject.id,
        projectPath: activeProject.path,
        contextId,
      }),
    });

    useBlueprintStore.getState().updateScanProgress(100);

    const data = await result.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Scan failed',
    };
  }
}

/**
 * Build decision data shown after scan completes
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  if (!result.success) return null;

  return {
    type: 'mynewscan-result',
    title: 'My New Scan Completed',
    description: `✅ Scan completed successfully!\n\n${JSON.stringify(result.data, null, 2)}`,
    severity: 'info',
    data: result.data,
    onAccept: async () => {
      console.log('[MyNewScan] User acknowledged results');
    },
    onReject: async () => {
      console.log('[MyNewScan] User dismissed results');
    },
  };
}
```

#### ✅ **Step 2: Add to Stepper Configuration** ⚠️ **CRITICAL**

**File**: `lib/stepperConfig.ts`

**⚠️ IMPORTANT**: This is the ONLY configuration file you need to update. Missing this step will cause:
```
[Blueprint] No technique config found for scan: mynewscan
```

Add your scan to the appropriate technique group:

```typescript
import { YourIcon } from 'lucide-react'; // Import your icon

export const NEXTJS_TECHNIQUE_GROUPS: TechniqueGroup[] = [
  ...DEFAULT_TECHNIQUE_GROUPS,
  {
    id: 'nextjs-ui',
    name: 'UI & Components',
    techniques: [
      // ... existing techniques
      {
        id: 'mynewscan',
        label: 'My New Scan',
        icon: YourIcon,
        color: 'blue', // 'blue' | 'cyan' | 'purple' | 'amber' | 'green' | 'red' | 'pink' | 'indigo'
        description: 'Brief description for UI',
        eventTitle: 'My New Scan Completed', // For tracking last run
        contextNeeded: false, // true if requires context selection
      },
    ],
    enabled: true,
    projectTypes: ['nextjs', 'react'],
  },
];
```

**That's it!** The scan status will be auto-generated in blueprintStore.

#### ✅ **Step 3: Add Dynamic Import to scanHandler** (Context Scans Only)

**File**: `lib/blueprint-scan/scanHandler.ts`

**⚠️ Only required if `contextNeeded: true` in Step 2**

Add your scan to the dynamic import sections:

**Section A: Execution (around line 75)**
```typescript
if (buttonConfig.contextNeeded && contextId) {
  // ... existing scans
  } else if (scanId === 'mynewscan') {
    const { executeMyNewScan } = await import('../context-scans/blueprintMyNewScan');
    result = await executeMyNewScan(contextId);
  }
}
```

**Section B: BuildDecision (around line 126)**
```typescript
if (buttonConfig.contextNeeded && contextId) {
  // ... existing scans
  } else if (scanId === 'mynewscan') {
    const { buildDecisionData } = await import('../context-scans/blueprintMyNewScan');
    decisionData = buildDecisionData(result);
  }
}
```

**For non-context scans**, add to `executeScanById` and `buildDecisionById` functions at the bottom of the file.

---

## File Checklist

### Minimum Required Files (2-3 files)

| File | Purpose | When Required |
|------|---------|---------------|
| **`lib/blueprintMyNewScan.ts`** | Scan implementation | ✅ Always |
| **`lib/stepperConfig.ts`** | **Single source of truth** | ✅ Always |
| **`lib/blueprint-scan/scanHandler.ts`** | Dynamic imports | ⚠️ Only for context scans or non-standard scans |

### Optional Files

| File | Purpose | When Needed |
|------|---------|-------------|
| **`api/blueprint/scans/[name]/route.ts`** | Server-side scan logic | If scan requires backend processing |
| **`lib/defaultStateMachines.ts`** | State machine config | If adding to onboarding flow editor (advanced) |

### Files You DON'T Need to Touch

- ❌ **`store/blueprintStore.ts`** - Scans are auto-generated
- ❌ **`lib/blueprintConfig.ts`** - Legacy adapter system (deprecated)
- ❌ **`DarkBlueprintLayout.tsx`** - No changes needed

---

## Integration Points

### Scan Execution Flow

When a user clicks a scan button:

1. **UI Layer**: `ScanButtonsBar` → `handleSelectScan()` → `handleScan()`
2. **Store Layer**: `blueprintStore.startScan(scanId)` → Sets `isRunning: true`
3. **Handler Layer**: `scanHandler.executeScan()`
   - Looks up scan in `stepperConfig`
   - Dynamically imports scan module
   - Executes scan with progress updates
4. **Result**: `buildDecisionData()` → Shows decision modal
5. **Event**: Creates scan event in database (for "days ago" tracking)

### Progress Updates

Update scan progress during execution:

```typescript
useBlueprintStore.getState().updateScanProgress(0);   // Start
useBlueprintStore.getState().updateScanProgress(25);  // 25%
useBlueprintStore.getState().updateScanProgress(50);  // 50%
useBlueprintStore.getState().updateScanProgress(100); // Complete
```

### Event Tracking

Events are automatically created when scans complete successfully. The `eventTitle` from stepperConfig is used to track last run times.

**"Days ago" calculation:**
- Events stored in `events.db` with timestamp
- `getDaysAgo(scanId)` calculates days since last run
- Powers the "3d ago" badges on scan buttons

---

## Examples

### Example 1: Simple Scan (No Context)

**Scenario**: Add a "Dependencies" scan that checks for outdated packages.

**1. Create** `lib/blueprintDependenciesScan.ts`:
```typescript
export async function executeDependenciesScan(): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();
  if (!activeProject) return { success: false, error: 'No project' };

  useBlueprintStore.getState().updateScanProgress(50);

  const response = await fetch('/api/blueprint/scans/dependencies', {
    method: 'POST',
    body: JSON.stringify({ projectPath: activeProject.path }),
  });

  const data = await response.json();
  return { success: true, data };
}

export function buildDecisionData(result: ScanResult): DecisionData | null {
  return {
    type: 'dependencies-result',
    title: 'Outdated Packages Found',
    description: `Found ${result.data.outdated.length} outdated packages`,
    severity: 'warning',
    onAccept: async () => {},
    onReject: async () => {},
  };
}
```

**2. Add to** `stepperConfig.ts`:
```typescript
{
  id: 'dependencies',
  label: 'Dependencies',
  icon: Package,
  color: 'amber',
  description: 'Check for outdated packages',
  eventTitle: 'Dependencies Scan Completed',
}
```

**Done!** No other files to update.

### Example 2: Context-Dependent Scan

**Scenario**: Add a "Screenshot" scan that captures component images.

**1. Create** `lib/context-scans/blueprintScreenshotScan.ts`:
```typescript
export async function executeScreenshotScan(contextId: string): Promise<ScanResult> {
  if (!contextId) {
    return { success: false, error: 'Context ID required' };
  }

  const contextRes = await fetch(`/api/contexts?contextId=${contextId}`);
  const context = await contextRes.json();

  const result = await fetch('/api/blueprint/scans/screenshot', {
    method: 'POST',
    body: JSON.stringify({ contextId, filePaths: context.data.filePaths }),
  });

  return { success: true, data: await result.json() };
}

export function buildDecisionData(result: ScanResult): DecisionData | null {
  return {
    type: 'screenshot-result',
    title: 'Screenshot Captured',
    description: `Screenshot saved at: ${result.data.path}`,
    severity: 'info',
    onAccept: async () => {},
    onReject: async () => {},
  };
}
```

**2. Add to** `stepperConfig.ts`:
```typescript
{
  id: 'screenshot',
  label: 'Screenshot',
  icon: Camera,
  color: 'pink',
  description: 'Capture component screenshots',
  eventTitle: 'Screenshot Scan Completed',
  contextNeeded: true, // ← Context-dependent!
}
```

**3. Add to** `scanHandler.ts`:
- Add to execution section (~line 75)
- Add to buildDecision section (~line 126)

---

## Best Practices

### ✅ DO

1. **Single Configuration**: Only update `stepperConfig.ts` for scan metadata
2. **Progress Updates**: Call `updateScanProgress()` at meaningful intervals
3. **Error Handling**: Always wrap scan logic in try-catch with detailed error messages
4. **Event Titles**: Use consistent naming: `"[Scan Name] Scan Completed"`
5. **Type Safety**: Define strong TypeScript interfaces for scan results
6. **User Feedback**: Provide clear, actionable messages in decision panels
7. **Context Validation**: Check if context is provided for context-dependent scans

### ❌ DON'T

1. **Don't** manually add scans to `blueprintStore.ts` (auto-generated)
2. **Don't** use inconsistent event titles between files
3. **Don't** skip progress updates (leaves user wondering if scan is frozen)
4. **Don't** hard-code project paths or IDs
5. **Don't** throw unhandled errors (always return `ScanResult`)
6. **Don't** assume context is present without checking
7. **Don't** forget to add dynamic imports for context scans

### Testing Checklist

Before shipping a new scan:

- [ ] Scan appears in ScanButtonsBar with correct icon/color
- [ ] Pre-scan decision shows correct information
- [ ] Progress bar animates during execution
- [ ] Post-scan decision displays results correctly
- [ ] Event is created in database with correct title
- [ ] "Days ago" badge shows after scan completes
- [ ] Error handling works (test with intentional failure)
- [ ] Context-dependent scans require context selection
- [ ] Scan status auto-appears in blueprintStore (check DevTools)

---

## Troubleshooting

### Scan button doesn't appear
- ✅ Check `stepperConfig.ts` has technique defined
- ✅ Check technique's `projectTypes` includes active project type
- ✅ Check group is `enabled: true`

### "No technique config found" error
- ✅ Verify scan is defined in `stepperConfig.ts`
- ✅ Check scan ID matches exactly between files
- ✅ Ensure technique is in the correct group for project type

### "Days ago" badge not showing
- ✅ Verify event is created with exact `eventTitle` match
- ✅ Check event is in database with correct `project_id`
- ✅ Verify `loadScanEvents()` is called on mount

### Progress bar not updating
- ✅ Ensure `startScan()` called before execution
- ✅ Check `updateScanProgress()` calls during scan
- ✅ Verify scan ID matches store keys

### Decision panel not appearing
- ✅ Check `buildDecisionData()` returns valid object
- ✅ Verify decision has both `onAccept` and `onReject`
- ✅ Check `addDecision()` is called after scan completes

---

## Migration from v1.0

If you have existing scans from v1.0 (before architecture simplification):

### Changes Summary

**Removed:**
- ❌ `BLUEPRINT_COLUMNS` (replaced by `stepperConfig.ts`)
- ❌ `columns` parameter from `executeScan()`
- ❌ Manual `DEFAULT_SCANS` maintenance

**Added:**
- ✅ Auto-generation of scan status from `stepperConfig`
- ✅ Simplified execution flow (single config source)

**No Changes:**
- ✅ Scan implementation files (`blueprintXXXScan.ts`)
- ✅ Dynamic imports in `scanHandler.ts`
- ✅ Decision panel flow
- ✅ Event tracking system

### Migration Steps

1. Ensure all your scans are defined in `stepperConfig.ts`
2. Remove any manual scan entries from `blueprintStore.ts` (now auto-generated)
3. Update any direct `columns` references to use `stepperConfig`
4. Test that all scans still execute correctly

---

## Summary

Adding a new Blueprint scan now requires only **2-3 files**:

1. ✅ **Implement scan logic** in `lib/blueprintXXXScan.ts`
2. ✅ **Add to stepperConfig** in `lib/stepperConfig.ts` (SINGLE SOURCE OF TRUTH)
3. ⚠️ **Add dynamic imports** in `lib/blueprint-scan/scanHandler.ts` (only for context scans)

The Blueprint system provides a robust, simplified framework with:
- ✅ Single source of truth (stepperConfig.ts)
- ✅ Auto-generated scan status
- ✅ Progress tracking
- ✅ Event logging
- ✅ Error handling
- ✅ Decision management
- ✅ Status indicators

Follow this guide and your new scan will integrate seamlessly!

---

**Questions?** Check existing scans for reference:
- Simple scan: `blueprintVisionScan.ts`
- Context scan: `blueprintPhotoScan.ts`
- Complex scan: `blueprintStructureScan.ts`
