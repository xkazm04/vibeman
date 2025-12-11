# Blueprint Pipeline Implementation Plan

## Phase 1: UI Separation ✅ COMPLETED

### Changes Made:
1. ✅ Added 'composer' to AppModule type in `onboardingStore.ts`
2. ✅ Added "BP Composer" tab to `TopBar.tsx` in the "Other" dropdown
3. ✅ Added 'composer' case to `page.tsx` for standalone rendering
4. ✅ Removed Composer button from `DarkBlueprintLayout.tsx`
5. ✅ Removed unused imports and store references

### Result:
- BlueprintComposer is now accessible via "Other → BP Composer" in top navigation
- Composer no longer embedded in Blueprint view
- Clean separation of concerns

---

## Phase 2: ChainBuilder Refactoring & Enhancement

### Current State Analysis

**File**: `src/app/features/Onboarding/sub_BlueprintComposer/components/ChainBuilder.tsx`
- **Lines**: 380 (needs to be <200 per file)
- **Current Features**:
  - Create/delete chains
  - Add/remove blueprints from chains
  - Reorder blueprints via drag & drop
  - Run chains (basic execution)

### Refactoring Strategy

#### 1. File Split (Target: <200 lines per file)

**Main ChainBuilder.tsx** (~150 lines):
- Chain list UI
- Chain selection state
- Integration with sub-components

**New Files**:
1. **ChainEditor.tsx** (~120 lines):
   - Chain header (name, run button, delete)
   - Blueprint list with drag & drop
   - Available blueprints selector

2. **ChainListItem.tsx** (~60 lines):
   - Individual chain list item component
   - Extraction of chain rendering logic

3. **ChainTypes.ts**:
   - Trigger types
   - Conditional branch types
   - Chain execution state types

4. **ChainExecutor.ts**:
   - Chain execution logic
   - Event listening system
   - Conditional branching logic

### Enhancement: Trigger System

#### Trigger Types

```typescript
export type TriggerType = 'manual' | 'event';

export interface ManualTrigger {
  type: 'manual';
}

export interface EventTrigger {
  type: 'event';
  eventType: string; // Event type to listen for
  eventTitle?: string; // Optional: specific event title
  projectId: string; // Which project's events to monitor
}

export type ChainTrigger = ManualTrigger | EventTrigger;
```

#### UI Components

**TriggerSelector.tsx**:
- Radio buttons for Manual/Event-based
- Event type dropdown (when event-based selected)
- Optional event title input
- Project selector

### Enhancement: Conditional Trees

#### Conditional Branch Types

```typescript
export interface ConditionalBranch {
  id: string;
  condition: EventCondition;
  trueChain: string[]; // Blueprint IDs if condition is true
  falseChain: string[]; // Blueprint IDs if condition is false
}

export interface EventCondition {
  type: 'event_check';
  eventType: string;
  eventTitle?: string;
  checkType: 'exists' | 'count_greater_than' | 'latest_within_hours';
  threshold?: number; // For count_greater_than or latest_within_hours
}
```

#### UI Components

**ConditionalBranchEditor.tsx**:
- Visual tree representation
- Condition builder:
  - Event type selector
  - Check type (exists, count > N, recent within X hours)
  - Threshold input
- Two parallel blueprint lists (True path / False path)
- Branch visualization with icons and colors

### Enhancement: Event Emission

#### Post-Chain Event

```typescript
export interface PostChainEvent {
  enabled: boolean;
  eventType: string;
  eventTitle: string;
  eventMessage: string;
}
```

#### UI Component

**PostChainEventEditor.tsx**:
- Toggle to enable/disable
- Event type input
- Event title input
- Event message textarea
- Preview of event that will be created

### Enhancement: Chain Listening System

#### Chain State Extensions

```typescript
export interface ScanChain {
  id: string;
  name: string;
  description: string;
  blueprints: string[];
  trigger: ChainTrigger;
  conditionalBranches?: ConditionalBranch[];
  postChainEvent?: PostChainEvent;
  // New fields:
  isActive: boolean; // On/off toggle for event listeners
  lastRun?: string; // ISO timestamp of last execution
  runCount: number; // How many times executed
}
```

#### Event Listener System

**chainEventListener.ts**:
```typescript
class ChainEventListener {
  private activeListeners: Map<string, NodeJS.Timer> = new Map();

  startListening(chainId: string, chain: ScanChain): void
  stopListening(chainId: string): void
  checkEventCondition(condition: EventCondition, projectId: string): Promise<boolean>
  executeChain(chain: ScanChain): Promise<void>
}
```

**Features**:
- Polls event database every 30 seconds for active chains
- Only listens when chain.isActive === true && chain.trigger.type === 'event'
- Executes chain when matching event detected
- Debouncing to prevent multiple executions

### UI Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ Chain Builder                                    [+ New Chain]  │
├─────────────┬───────────────────────────────────────────────────┤
│ Chains (3)  │ Chain: "Full Context Scan Pipeline"              │
│             │ ┌────────────────────────────────────────────────┐│
│ › Pipeline  ││ Trigger: ● Manual  ○ Event-based                ││
│   Basic     ││                                                  ││
│   Advanced  ││ ┌────────────────────────────────────────────┐  ││
│             │││ 1. [Structure Scan] ──► 2. [Context Scan]   │  ││
│             │││                                               │  ││
│             │││ 3. Conditional: "Has contexts?"              │  ││
│             │││    ├─ True: [4. Selectors] → [5. Review]    │  ││
│             │││    └─ False: [Skip to Goals]                │  ││
│             ││└────────────────────────────────────────────┘  ││
│             ││                                                  ││
│             ││ Post-Chain Event:  [✓] Emit event               ││
│             ││   Type: scan_complete                           ││
│             ││   Title: Full pipeline completed                ││
│             ││                                                  ││
│             ││ Status: ● Active (listening)                    ││
│             ││ [Run Now] [⏸ Pause] [Delete]                    ││
│             │└────────────────────────────────────────────────┘│
└─────────────┴───────────────────────────────────────────────────┘
```

### Implementation Order

1. **Extract Components** (Refactor to <200 lines)
   - Create ChainEditor.tsx
   - Create ChainListItem.tsx
   - Create ChainTypes.ts
   - Refactor main ChainBuilder.tsx

2. **Add Trigger System**
   - Update types in ChainTypes.ts
   - Create TriggerSelector.tsx
   - Update chain creation to include trigger
   - Update store to persist trigger

3. **Add Conditional Branches**
   - Create conditional types
   - Create ConditionalBranchEditor.tsx
   - Update execution engine for branching
   - Visual tree rendering

4. **Add Post-Chain Events**
   - Create PostChainEventEditor.tsx
   - Integrate with execution engine
   - Call eventRepository.createEvent on completion

5. **Implement Listening System**
   - Create chainEventListener.ts service
   - Add isActive toggle to UI
   - Start/stop listeners based on toggle
   - Poll database for event triggers
   - Execute chains when events match

### Database Schema

No new tables needed! Leveraging existing:
- `events` table for event triggers
- `blueprints` stored in local state
- Chains configuration stored in Zustand persist

### API Routes (if needed)

**Optional**: `/api/chains/listen` - Server-side event listener
- Could run as background process
- Better than client-side polling
- Consider for future optimization

---

## Testing Plan

1. **Manual Trigger Chain**:
   - Create chain with manual trigger
   - Run chain, verify execution

2. **Event-Based Chain**:
   - Create chain with event trigger
   - Toggle active
   - Emit matching event via Blueprint scan
   - Verify chain auto-executes

3. **Conditional Branch**:
   - Create chain with conditional
   - Test both True and False paths
   - Verify correct branch executes

4. **Post-Chain Event**:
   - Create chain with post-event
   - Run chain
   - Check events table for new event

5. **Active/Inactive Toggle**:
   - Create event-based chain
   - Toggle off → verify no execution
   - Toggle on → verify execution resumes

---

## Success Criteria

- ✅ All ChainBuilder files <200 lines
- ✅ Can create manual trigger chains
- ✅ Can create event-based trigger chains
- ✅ Event listeners start/stop with toggle
- ✅ Conditional branches work correctly
- ✅ Post-chain events are created
- ✅ Visual tree shows full execution flow
- ✅ Chains execute correctly with all features
