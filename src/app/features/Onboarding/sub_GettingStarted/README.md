# Getting Started Module

Refactored Getting Started panel with clean separation of concerns.

## Structure

```
sub_GettingStarted/
├── components/           # UI Components
│   ├── StarterTasks.tsx     # Tasks list with checkboxes
│   ├── StarterBlueprint.tsx # Blueprint access button
│   └── index.ts             # Component exports
├── lib/                  # Configuration & Logic
│   ├── types.ts             # TypeScript interfaces
│   ├── config.ts            # Task configuration & constants
│   └── index.ts             # Lib exports
└── README.md            # This file
```

## Components

### StarterTasks
Displays the onboarding task checklist with:
- Animated checkboxes with completion states
- Task highlighting (next task gets glow effect)
- Future tasks shown with reduced opacity
- Hand-written font style (Caveat)
- Click to navigate to relevant module

**Props:**
- `tasks: OnboardingTask[]` - Array of tasks to display
- `onTaskClick: (task: OnboardingTask) => void` - Handler for task clicks

### StarterBlueprint
Large hand-written "BLUEPRINT" button to access the full Blueprint view:
- Animated hover effects
- Glow and text shadow
- Hand-drawn underline accent
- Animated arrow indicator

**Props:**
- `onOpenBlueprint: () => void` - Handler for opening Blueprint modal

## Configuration

### ONBOARDING_TASKS
Array of task configurations with:
- `id` - Unique task identifier (matches store step IDs)
- `label` - Display text
- `description` - Helper text shown for incomplete tasks
- `location` - Module to navigate to when clicked

### TOTAL_TASKS
Constant for the total number of onboarding tasks (used in progress indicator).

## Types

### OnboardingTask
```typescript
interface OnboardingTask {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  location: ModuleLocation;
}
```

### ModuleLocation
```typescript
type ModuleLocation = 'coder' | 'ideas' | 'tinder' | 'tasker' | 'reflector' | 'contexts' | 'docs';
```

## Usage

The Getting Started panel is used in `ControlPanel.tsx`:

```tsx
import { StarterTasks, StarterBlueprint } from '../sub_GettingStarted/components';
import { buildTasks } from '../sub_GettingStarted/lib/config';

const tasks = buildTasks(isStepCompleted);

<StarterTasks tasks={tasks} onTaskClick={handleTaskClick} />
<StarterBlueprint onOpenBlueprint={onOpenBlueprint} />
```

## Drawer Enhancement

The Drawer component now supports `transparentOverlay` prop:
- When `true`, no backdrop is rendered
- User can see and interact with the app behind the drawer
- Perfect for the Getting Started panel to show context while guiding users

## Design System

- **Font**: Caveat (hand-written style) for Blueprint branding
- **Colors**: Cyan/blue accents with glow effects
- **Animations**: Framer Motion for smooth transitions
- **Pattern**: Blueprint grid background image
