# Blueprint Configuration Analysis

## Current Architecture (4 Configuration Files)

### 1. **stepperConfig.ts** - PRIMARY RUNTIME CONFIG ✅
- **Purpose**: Modern technique-based scan configuration
- **Used by**: DarkBlueprintLayout, ScanButtonsBar, scanHandler (fallback)
- **Content**: Grouped technique definitions (simple, declarative)
- **Status**: **ACTIVELY USED** - Main source of truth

```typescript
export const NEXTJS_TECHNIQUE_GROUPS: TechniqueGroup[] = [
  {
    id: 'nextjs-ui',
    techniques: [
      { id: 'photo', label: 'Photo', icon: Camera, ... },
      { id: 'test', label: 'Test', icon: FlaskConical, ... },
      // etc
    ]
  }
]
```

### 2. **defaultStateMachines.ts** - STATE MACHINE ORCHESTRATION ✅
- **Purpose**: State machine editor feature (separate from runtime scans)
- **Used by**: StateMachineEditor, StateMachineStore, BlueprintConfigButton
- **Content**: States, transitions, completion conditions
- **Status**: **SEPARATE FEATURE** - Not redundant with stepperConfig
- **Includes**: Scan handlers (execute + buildDecision functions)

```typescript
export const DEFAULT_NEXTJS_STATE_MACHINE: StateMachineConfig = {
  states: [
    createScanState({
      id: 'testDesign',
      scanHandler: {
        execute: testDesignScan.executeTestDesignScan,
        buildDecision: testDesignScan.buildDecisionData,
      }
    })
  ],
  transitions: [...]
}
```

### 3. **blueprintConfig.ts (BLUEPRINT_COLUMNS)** - LEGACY ADAPTER SYSTEM ⚠️
- **Purpose**: Adapter-based architecture using ScanRegistry
- **Used by**: scanHandler (primary lookup), blueprintStore (initialization)
- **Content**: Dynamically built from ScanRegistry adapters
- **Status**: **LEGACY/HYBRID** - Complex adapter pattern, but not fully adopted

```typescript
export const BLUEPRINT_COLUMNS: ColumnConfig[] = buildBlueprintColumns();
// Builds from ScanRegistry adapters (nextjs-vision, nextjs-photo, etc.)
```

### 4. **blueprintStore.ts (DEFAULT_SCANS)** - STATE INITIALIZATION ⚠️
- **Purpose**: Initial state for scan status tracking
- **Used by**: blueprintStore initialization
- **Content**: Manual list of all scan names
- **Status**: **REDUNDANT** - Should be auto-generated from stepperConfig

```typescript
const DEFAULT_SCANS: Record<string, ScanStatus> = {
  vision: { name: 'Vision', lastRun: null, ... },
  testDesign: { name: 'Test Design', lastRun: null, ... },
  // Manually maintained list
}
```

---

## Redundancies Identified

### 🔴 **Major Redundancy: Technique Definitions Duplicated**

Same scan definitions exist in MULTIPLE places:

| Scan | stepperConfig.ts | defaultStateMachines.ts | BLUEPRINT_COLUMNS | DEFAULT_SCANS |
|------|-----------------|------------------------|-------------------|---------------|
| photo | ✓ (technique) | ✓ (state) | ✓ (button) | ✓ (status) |
| testDesign | ✓ (technique) | ✓ (state) | ❌ | ✓ (status) |
| separator | ✓ (technique) | ✓ (state) | ❌ | ✓ (status) |
| test | ✓ (technique) | ✓ (state) | ❌ | ✓ (status) |

**Problem**: Adding a new scan requires updating 4 files with duplicate metadata (id, label, icon, color, eventTitle)

### 🟡 **Medium Redundancy: Dual Config Systems**

scanHandler.ts supports TWO lookup paths:

```typescript
// Path 1: Check columns (adapter-based)
for (const column of columns) {
  const button = column.buttons.find(b => b.id === scanId);
  if (button) { buttonConfig = button; break; }
}

// Path 2: Fallback to stepperConfig (technique-based)
if (!buttonConfig && stepperConfig) {
  for (const group of stepperConfig.groups) {
    const technique = group.techniques.find(t => t.id === scanId);
    // Convert to buttonConfig format
  }
}
```

**Problem**: Maintains two parallel config systems (adapters vs techniques)

### 🟢 **Minor Redundancy: Manual State Initialization**

blueprintStore DEFAULT_SCANS is manually maintained:

```typescript
const DEFAULT_SCANS: Record<string, ScanStatus> = {
  photo: { name: 'Photo', lastRun: null, ... },
  testDesign: { name: 'Test Design', lastRun: null, ... },
  // Must be updated manually when scans are added
}
```

**Problem**: Can auto-generate from stepperConfig instead

---

## Consolidation Opportunities

### Option A: **Keep stepperConfig as Single Source of Truth** ⭐ RECOMMENDED

**Strategy**: Eliminate BLUEPRINT_COLUMNS (adapter system), use only stepperConfig

**Changes:**
1. ✅ Remove columns parameter from executeScan()
2. ✅ Remove BLUEPRINT_COLUMNS from blueprintStore
3. ✅ Simplify scanHandler to use only stepperConfig
4. ✅ Auto-generate DEFAULT_SCANS from stepperConfig
5. ⚠️ Keep defaultStateMachines.ts (separate feature)

**Pros:**
- Single source of truth for runtime scans
- Simpler architecture
- Easier to maintain
- No adapter complexity for basic scans

**Cons:**
- Lose adapter-based extensibility (can revisit later if needed)
- Need to migrate any adapter-specific logic

### Option B: **Consolidate to Shared Technique Registry**

**Strategy**: Extract common technique definitions to shared module

**Changes:**
1. Create `scanTechniqueDefinitions.ts` with base definitions
2. Both stepperConfig and defaultStateMachines import from it
3. Keep both files but reduce duplication

**Pros:**
- Maintains both systems
- Reduces duplication of technique metadata
- Backward compatible

**Cons:**
- Still maintains dual config systems
- More complex architecture

### Option C: **Fully Adopt Adapter System**

**Strategy**: Migrate everything to adapter-based architecture

**Changes:**
1. Remove stepperConfig.ts
2. Use only BLUEPRINT_COLUMNS (adapter registry)
3. All scans become adapters

**Pros:**
- Framework-agnostic
- Extensible adapter pattern

**Cons:**
- More complex for simple scans
- Larger refactoring effort
- Overkill for current use case

---

## Recommended Approach: Option A (Simplified Architecture)

### Phase 1: Remove BLUEPRINT_COLUMNS (Legacy Adapter System)

**Rationale**: The adapter system is not fully adopted and adds complexity

**Steps:**
1. Remove `columns` parameter from `executeScan()`
2. Update `scanHandler.ts` to use only `stepperConfig`
3. Remove `BLUEPRINT_COLUMNS` from `blueprintStore`
4. Keep adapter files for reference but don't use in runtime

### Phase 2: Auto-Generate DEFAULT_SCANS

**Rationale**: Eliminate manual maintenance

**Steps:**
1. Create utility function `generateDefaultScans(stepperConfig)`:
   ```typescript
   function generateDefaultScans(config: StepperConfig): Record<string, ScanStatus> {
     const scans: Record<string, ScanStatus> = {};
     for (const group of config.groups) {
       for (const technique of group.techniques) {
         scans[technique.id] = {
           name: technique.label,
           lastRun: null,
           isRunning: false,
           progress: 0,
           hasError: false,
         };
       }
     }
     return scans;
   }
   ```
2. Replace `DEFAULT_SCANS` with dynamic generation

### Phase 3: Reduce Duplication Between stepperConfig and defaultStateMachines

**Rationale**: Both need technique metadata, but serve different purposes

**Steps:**
1. Create `scanTechniqueDefinitions.ts` with shared metadata:
   ```typescript
   export const SCAN_TECHNIQUES = {
     photo: {
       id: 'photo',
       label: 'Photo',
       icon: Camera,
       color: 'pink',
       eventTitle: 'Photo Scan Completed',
       contextNeeded: true,
       description: 'Capture visual snapshots of components',
     },
     // ... all techniques
   }
   ```
2. Update stepperConfig to use: `techniques: [SCAN_TECHNIQUES.photo, ...]`
3. Update defaultStateMachines to use: `createScanState(SCAN_TECHNIQUES.photo, { scanHandler: ... })`

---

## Implementation Priority

1. **HIGH**: Auto-generate DEFAULT_SCANS from stepperConfig (eliminates manual maintenance)
2. **MEDIUM**: Remove BLUEPRINT_COLUMNS if not actively used (simplifies architecture)
3. **LOW**: Extract shared technique definitions (nice-to-have, reduces duplication)

---

## Updated Development Workflow (After Consolidation)

### To Add a New Scan:

**Before (4 files):**
1. ❌ blueprintMyNewScan.ts
2. ❌ stepperConfig.ts
3. ❌ defaultStateMachines.ts
4. ❌ blueprintStore.ts (DEFAULT_SCANS)
5. ❌ scanHandler.ts (dynamic imports)

**After (3 files):**
1. ✅ blueprintMyNewScan.ts (scan implementation)
2. ✅ stepperConfig.ts (technique definition) ← Single source of truth
3. ✅ defaultStateMachines.ts (state machine config - only if part of onboarding flow)
4. ✅ scanHandler.ts (dynamic imports - only if not using inline scanHandler)

**After Option A + Phase 3 (2 files):**
1. ✅ blueprintMyNewScan.ts (scan implementation)
2. ✅ scanTechniqueDefinitions.ts (technique metadata) ← Single source of truth
3. ⚠️ defaultStateMachines.ts references technique (no duplication)
4. ⚠️ stepperConfig.ts references technique (no duplication)
