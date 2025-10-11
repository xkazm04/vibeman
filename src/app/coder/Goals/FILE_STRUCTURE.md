# Goals Module File Structure

## Directory Overview

```
src/app/coder/Goals/
├── lib/                                    # Utilities and constants
│   ├── constants.ts                        # Status configs, constants
│   ├── goalUtils.ts                        # Utility functions
│   └── index.ts                            # Barrel exports
├── GoalsLayout.tsx                         # Main container (refactored)
├── GoalsTimeline.tsx                       # Timeline visualization
├── GoalsTitle.tsx                          # Goal title display
├── GoalsAddModalContent.tsx                # Add goal form (new)
├── GoalsDetailModalContent.tsx             # Goal detail view (new)
├── GoalsDetailDescription.tsx              # Description section
├── GoalsDetailActions.tsx                  # Action buttons
├── GoalsAddModal.tsx                       # [DEPRECATED]
├── GoalsDetailModal.tsx                    # [DEPRECATED]
├── GoalsDetailModal_Glass.tsx              # [DEPRECATED]
├── REFACTORING_SUMMARY.md                  # Detailed documentation
└── FILE_STRUCTURE.md                       # This file
```

## Core Files

### `lib/constants.ts`
**Exports**:
```typescript
// Status configuration for all goal statuses
export const STATUS_CONFIGS: Record<Goal['status'], StatusConfig>;
export function getStatusConfig(status: Goal['status']): StatusConfig;

// Timeline constants
export const TIMELINE_CONSTANTS = {
  MAX_VISIBLE_GOALS: 10,
  GOAL_WIDTH: 80,
  SCROLL_DURATION: 0.5,
  ANIMATION_DELAY_PER_ITEM: 0.1
};

// Modal constants
export const MODAL_CONSTANTS = {
  FADE_IN_DELAY: 50,
  TRANSITION_DURATION: 300,
  MAX_WIDTH_DETAIL: 'max-w-6xl',
  MAX_WIDTH_ADD: 'max-w-lg'
};
```

**Status Config Interface**:
```typescript
interface StatusConfig {
  text: string;           // Display text
  color: string;          // Text color class
  bgColor: string;        // Background color class
  borderColor: string;    // Border color class
  gradient?: string;      // Gradient class
  textColor?: string;     // Alternative text color
  glow?: string;          // Glow effect class
  icon: LucideIcon;       // Icon component
}
```

### `lib/goalUtils.ts`
**Exports**:
```typescript
export function sortGoalsByOrder(goals: Goal[]): Goal[];
export function findInProgressGoal(goals: Goal[]): Goal | null;
export function getNextOrder(goals: Goal[]): number;
export function formatStatus(status: Goal['status']): string;
export function calculateOptimalTimelineOffset(
  goals: Goal[],
  maxVisibleGoals: number,
  goalWidth: number
): number;
export function validateGoalData(goal: Partial<Goal>): boolean;
export function formatDate(
  date: string | Date,
  format?: 'short' | 'long'
): string;
```

## Components

### `GoalsLayout.tsx` (Main Container)
**Purpose**: Main layout and state management
**Dependencies**: 
- `useGlobalModal` - Modal management
- `useGoals` - Goal CRUD operations
- `lib` - Utilities and constants

**Key Features**:
- Project-level goal management
- Modal integration via `useGlobalModal`
- Goal selection and transitions
- Analysis trigger integration

**Lines**: ~200

### `GoalsTimeline.tsx`
**Purpose**: Horizontal scrollable timeline of goals
**Dependencies**: `lib/constants`, `lib/goalUtils`

**Key Features**:
- Horizontal scroll with navigation arrows
- Optimal positioning for in-progress goal
- Animated goal points with status styling
- Enhanced glow effects for selected goal
- Mouse wheel scrolling support

**Lines**: ~120

### `GoalsTitle.tsx`
**Purpose**: Display selected goal title and status
**Dependencies**: `lib/goalUtils`

**Key Features**:
- Animated transitions between goals
- Clickable to open detail modal
- Status formatting
- Smooth hover effects

**Lines**: ~50

### `GoalsAddModalContent.tsx` (New)
**Purpose**: Form content for adding new goals
**Props**:
- `onSubmit: (goal) => void`
- `onClose: () => void`

**Key Features**:
- Title and description inputs
- Status selection with icons
- Form validation
- Uses `validateGoalData()` utility
- Uses `getStatusConfig()` for status display

**Lines**: ~100

### `GoalsDetailModalContent.tsx` (New)
**Purpose**: Detailed view and editing of goals
**Props**:
- `goal: Goal`
- `projectId: string | null`
- `onSave?: (id, updates) => Promise<Goal | null>`
- `onClose: () => void`

**Key Features**:
- View/edit mode toggle
- Status, title, description editing
- Metadata display (order, dates)
- Integrated save/delete actions
- Error handling and feedback
- Uses status constants for consistent UI

**Lines**: ~200

### `GoalsDetailDescription.tsx`
**Purpose**: Description section for detail modal
**Props**:
- `editedGoal: Goal`
- `isEditing: boolean`
- `onFieldChange: (field, value) => void`

**Key Features**:
- Textarea for editing
- Read-only view mode
- Placeholder for empty state

**Lines**: ~40

### `GoalsDetailActions.tsx`
**Purpose**: Action buttons for detail modal
**Props**:
- `editedGoal: Goal`
- `isEditing: boolean`
- `isSaving: boolean`
- `onEditToggle: () => void`
- `onSave: () => Promise<void>`
- `onClose: () => void`
- `onDelete: (id) => Promise<boolean>`

**Key Features**:
- Edit/Save/Cancel buttons
- Delete button with confirmation
- Loading states
- Success/error status messages
- Validation integration

**Lines**: ~130

## Usage Examples

### Using Status Configuration
```typescript
import { getStatusConfig } from './lib';

const statusConfig = getStatusConfig('in_progress');
// {
//   text: 'In Progress',
//   color: 'text-yellow-400',
//   bgColor: 'bg-yellow-500/20',
//   borderColor: 'border-yellow-500/30',
//   icon: Clock,
//   ...
// }
```

### Using Goal Utilities
```typescript
import { 
  sortGoalsByOrder, 
  findInProgressGoal, 
  getNextOrder,
  formatStatus,
  validateGoalData,
  formatDate
} from './lib';

// Sort goals
const sorted = sortGoalsByOrder(goals);

// Find in-progress goal
const inProgress = findInProgressGoal(goals);

// Get next order number
const nextOrder = getNextOrder(goals);

// Format status
const status = formatStatus('in_progress'); // "in progress"

// Validate goal data
const isValid = validateGoalData({ title: 'My Goal' }); // true

// Format date
const dateStr = formatDate(new Date(), 'short'); // "Jan 15, 2024"
```

### Using with useGlobalModal
```typescript
import { useGlobalModal } from '@/hooks/useGlobalModal';
import { Target, Plus } from 'lucide-react';
import GoalsDetailModalContent from './GoalsDetailModalContent';
import GoalsAddModalContent from './GoalsAddModalContent';

// In component
const { showShellModal, hideModal } = useGlobalModal();

// Show detail modal
const showDetail = (goal: Goal) => {
  showShellModal(
    {
      title: 'Goal Details',
      subtitle: 'Review and manage your objective',
      icon: Target,
      iconBgColor: 'from-blue-600/20 to-slate-600/20',
      iconColor: 'text-blue-400',
      maxWidth: 'max-w-6xl',
      maxHeight: 'max-h-[90vh]'
    },
    {
      customContent: (
        <GoalsDetailModalContent
          goal={goal}
          projectId={projectId}
          onSave={updateGoal}
          onClose={hideModal}
        />
      ),
      isTopMost: true
    }
  );
};

// Show add modal
const showAdd = () => {
  showShellModal(
    {
      title: 'Add New Goal',
      subtitle: 'Create a new project goal',
      icon: Plus,
      iconBgColor: 'from-slate-700/20 to-slate-800/20',
      iconColor: 'text-slate-300',
      maxWidth: 'max-w-lg',
      maxHeight: 'max-h-[85vh]'
    },
    {
      customContent: (
        <GoalsAddModalContent
          onSubmit={handleCreate}
          onClose={() => {
            setShowAddGoal(false);
            hideModal();
          }}
        />
      ),
      isTopMost: true
    }
  );
};
```

## Import Patterns

### Barrel Import (Recommended)
```typescript
import { 
  getStatusConfig, 
  STATUS_CONFIGS,
  TIMELINE_CONSTANTS,
  sortGoalsByOrder,
  findInProgressGoal,
  getNextOrder,
  formatStatus,
  validateGoalData,
  formatDate
} from './lib';
```

### Individual Imports
```typescript
import { getStatusConfig } from './lib/constants';
import { sortGoalsByOrder } from './lib/goalUtils';
```

## Type Definitions

### Goal (from src/types/index.ts)
```typescript
interface Goal {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'done' | 'undecided' | 'rejected';
  order: number;
  projectId: string;
  created_at?: string;
  updated_at?: string;
}
```

### StatusConfig (from lib/constants.ts)
```typescript
interface StatusConfig {
  text: string;
  color: string;
  bgColor: string;
  borderColor: string;
  gradient?: string;
  textColor?: string;
  glow?: string;
  icon: typeof CheckCircle;
}
```

## Dependencies

### External
- `react` - Core React library
- `framer-motion` - Animations
- `lucide-react` - Icons

### Internal
- `@/hooks/useGoals` - Goal CRUD operations
- `@/hooks/useGlobalModal` - Modal management
- `@/stores/*` - State management
- `@/helpers/timelineStyles` - Timeline styling utilities
- `@/types` - TypeScript types

## Testing Strategy

### Unit Tests (lib/)
```typescript
// constants.ts
describe('getStatusConfig', () => {
  it('returns correct config for each status', () => {
    expect(getStatusConfig('done').text).toBe('Completed');
    expect(getStatusConfig('in_progress').icon).toBe(Clock);
  });
});

// goalUtils.ts
describe('sortGoalsByOrder', () => {
  it('sorts goals by order property', () => {
    const unsorted = [{ order: 3 }, { order: 1 }, { order: 2 }];
    const sorted = sortGoalsByOrder(unsorted);
    expect(sorted.map(g => g.order)).toEqual([1, 2, 3]);
  });
});

describe('validateGoalData', () => {
  it('returns true for valid data', () => {
    expect(validateGoalData({ title: 'Test' })).toBe(true);
  });
  
  it('returns false for invalid data', () => {
    expect(validateGoalData({ title: '' })).toBe(false);
    expect(validateGoalData({ title: '   ' })).toBe(false);
  });
});
```

### Component Tests
```typescript
// GoalsAddModalContent.tsx
describe('GoalsAddModalContent', () => {
  it('calls onSubmit with valid data', () => {
    const onSubmit = jest.fn();
    render(<GoalsAddModalContent onSubmit={onSubmit} onClose={jest.fn()} />);
    
    fireEvent.change(screen.getByPlaceholderText(/title/i), {
      target: { value: 'New Goal' }
    });
    fireEvent.click(screen.getByText(/Add Goal/i));
    
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'New Goal',
      status: 'open'
    });
  });
  
  it('disables submit for empty title', () => {
    render(<GoalsAddModalContent onSubmit={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText(/Add Goal/i)).toBeDisabled();
  });
});
```

## Performance Considerations

### Optimizations
- Constants prevent recalculation on each render
- Pure utility functions are fast and predictable
- Timeline scroll calculations are memoized
- Modal content components re-render only when props change

### Best Practices
- Use `useCallback` for event handlers passed to modals
- Memoize expensive calculations with `useMemo`
- Keep modal content components pure when possible

## Accessibility

### Implemented
- Semantic HTML in all form fields
- Proper ARIA labels via placeholders
- Keyboard navigation support
- Focus management in modals
- Clear error messages

### To Improve
- Add ARIA live regions for status updates
- Enhance screen reader announcements
- Full keyboard navigation in timeline
- Better focus trapping in modals

## Summary

The Goals module now features:
- ✅ Centralized constants and utilities in `lib/`
- ✅ Modern modal management with `useGlobalModal`
- ✅ Clean component composition
- ✅ Comprehensive type safety
- ✅ Excellent code organization
- ✅ Consistent styling throughout
- ✅ Easy to test and maintain

**Total Files**: 11 (3 lib files, 8 components)
**Lines of Code**: ~900 (well-organized and documented)
**Test Coverage**: Ready for comprehensive testing
