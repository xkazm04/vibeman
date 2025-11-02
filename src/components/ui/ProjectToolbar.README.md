# ProjectToolbar Component

## Overview

A reusable, horizontally aligned toolbar component for quick-action icons. Built with Lucide icons, Framer Motion animations, and full accessibility support.

## Location

- **Component**: `src/components/ui/ProjectToolbar.tsx`
- **Examples**: `src/components/ui/ProjectToolbar.examples.tsx`

## Features

- **Space-efficient horizontal layout** - Icons aligned in a row
- **Framer Motion hover animations** - Scale and lift effects on hover
- **Fully keyboard-focusable** - Required `aria-label` for all buttons
- **Responsive design** - Collapses to stacked layout on small screens
- **Multiple color schemes** - blue, cyan, purple, green, orange, slate
- **Loading and disabled states** - Built-in UI states
- **Flexible positioning** - top-center, top-right, top-left
- **Glassmorphism styling** - Backdrop blur, gradient backgrounds
- **TypeScript types** - Full type safety with exported interfaces

## Usage

### Basic Example

```tsx
import ProjectToolbar, { ToolbarAction, defaultActions } from '@/components/ui/ProjectToolbar';
import { Database, FileText, RefreshCw } from 'lucide-react';

function MyPage() {
  const actions: ToolbarAction[] = [
    defaultActions.dbSync(() => console.log('Syncing...')),
    defaultActions.viewDocs(() => window.open('/docs', '_blank')),
    defaultActions.refresh(() => location.reload()),
  ];

  return <ProjectToolbar actions={actions} position="top-center" styled />;
}
```

### Custom Actions

```tsx
const customActions: ToolbarAction[] = [
  {
    icon: Database,
    label: 'Sync database',
    onClick: async () => {
      // Your sync logic
    },
    colorScheme: 'blue',
    tooltip: 'Synchronize database',
    loading: false,
    disabled: false,
  },
  {
    icon: Settings,
    label: 'Settings',
    onClick: () => {
      // Your settings logic
    },
    colorScheme: 'purple',
    tooltip: 'Open settings',
  },
];

<ProjectToolbar actions={customActions} position="top-right" styled={false} />
```

### With Loading State

```tsx
const [isLoading, setIsLoading] = useState(false);

const actions: ToolbarAction[] = [
  {
    icon: RefreshCw,
    label: 'Refresh',
    onClick: async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    },
    colorScheme: 'green',
    loading: isLoading,
  },
];
```

## Props

### ProjectToolbarProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `actions` | `ToolbarAction[]` | required | Array of action buttons to display |
| `className` | `string` | `''` | Additional CSS classes |
| `position` | `'top-center' \| 'top-right' \| 'top-left'` | `'top-center'` | Toolbar position |
| `styled` | `boolean` | `true` | Show background blur and border |

### ToolbarAction

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `LucideIcon` | required | Lucide icon component |
| `label` | `string` | required | Accessible label (required for a11y) |
| `onClick` | `() => void` | required | Click handler |
| `tooltip` | `string` | `label` | Tooltip text |
| `colorScheme` | `'blue' \| 'cyan' \| 'purple' \| 'green' \| 'orange' \| 'slate'` | `'slate'` | Button color |
| `loading` | `boolean` | `false` | Show loading spinner |
| `disabled` | `boolean` | `false` | Disable button |

## Default Actions

The component exports three preset actions for common use cases:

```tsx
import { defaultActions } from '@/components/ui/ProjectToolbar';

defaultActions.dbSync(onClick)      // Database sync button (blue)
defaultActions.viewDocs(onClick)    // Documentation button (cyan)
defaultActions.refresh(onClick)     // Refresh button (green)
```

## Color Schemes

Each color scheme includes:
- Background gradient with transparency
- Hover state with increased opacity
- Text color
- Glow effect on hover

Available schemes:
- `blue` - Database/data operations
- `cyan` - Documentation/info
- `purple` - Settings/configuration
- `green` - Success/refresh actions
- `orange` - Warning/quick actions
- `slate` - Neutral/default

## Integration Example

See `src/app/features/Ideas/IdeasLayout.tsx` for a complete integration example with:
- Database sync action
- Documentation viewer
- Refresh functionality

## Design Language

The toolbar follows the Vibeman app design patterns:
- **Glassmorphism**: Backdrop blur with semi-transparent backgrounds
- **Gradients**: Subtle color gradients for depth
- **Borders**: Low-opacity borders for definition
- **Shadows**: Layered shadows for elevation
- **Animations**: Smooth transitions with easing curves
- **Dark theme**: Optimized for dark backgrounds

## Accessibility

- All buttons have required `aria-label` attributes
- Keyboard focusable with standard tab navigation
- Visual focus indicators
- Tooltips for additional context
- Disabled state prevents interaction
- Loading state provides visual feedback

## Responsive Behavior

- **Desktop**: Horizontal row layout
- **Mobile**: Wraps to multiple rows if needed
- **Spacing**: Consistent gap between buttons
- **Touch targets**: Adequate size for mobile interaction

## Architecture Notes

- Uses Framer Motion for animations
- Fully typed with TypeScript
- Follows React best practices
- Memoization-friendly (stable prop interfaces)
- No side effects in render
- Composable and reusable

## Future Extensions

Potential enhancements:
- Dropdown menus for grouped actions
- Badge notifications on buttons
- Keyboard shortcuts
- Action groups with separators
- Customizable sizes (sm, md, lg)
- Animation presets

## Related Components

- `IconButton` - Individual icon button component
- `GradientButton` - Full-width gradient buttons
- `ActionGroup` - Button grouping utilities
