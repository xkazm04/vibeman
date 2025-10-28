# GradientButton Component

A flexible, reusable button component with gradient styling that standardizes gradient usage across the Vibeman codebase.

## Overview

The `GradientButton` component encapsulates complex gradient behavior and provides a consistent, maintainable way to create styled buttons throughout the application. It reduces CSS bloat in JSX and makes future color scheme changes trivial to implement.

## Features

- **Predefined Color Schemes**: 13 built-in gradient color schemes matching the app's design language
- **Custom Gradients**: Support for custom from/to/via color configurations
- **Flexible Opacity Levels**: Four opacity levels (subtle, medium, strong, solid)
- **Icon Support**: Integrate Lucide icons with left/right positioning
- **Loading States**: Built-in loading spinner animation
- **Disabled States**: Proper disabled styling and cursor handling
- **Framer Motion Integration**: Smooth hover and tap animations
- **Size Variants**: Three size options (sm, md, lg)
- **Multiple Gradient Directions**: Support for 8 gradient directions

## Installation

The component is already exported from `@/components/ui`:

```typescript
import { GradientButton } from '@/components/ui';
```

## Basic Usage

```tsx
import { GradientButton } from '@/components/ui';
import { Zap } from 'lucide-react';

function MyComponent() {
  return (
    <GradientButton
      colorScheme="blue"
      onClick={() => console.log('Clicked!')}
    >
      Click Me
    </GradientButton>
  );
}
```

## Predefined Color Schemes

Available color schemes: `blue`, `indigo`, `purple`, `pink`, `red`, `orange`, `amber`, `yellow`, `green`, `emerald`, `cyan`, `slate`, `gray`

```tsx
<GradientButton colorScheme="blue">Blue Button</GradientButton>
<GradientButton colorScheme="purple">Purple Button</GradientButton>
<GradientButton colorScheme="green">Green Button</GradientButton>
<GradientButton colorScheme="yellow">Yellow Button</GradientButton>
```

### Color Scheme Details

Each predefined scheme includes:
- Gradient colors (from/to)
- Border color
- Shadow color
- Text color (white or gray-900 for light backgrounds)

For example, the `blue` scheme:
- Gradient: `blue-600` → `cyan-600`
- Hover: `blue-500` → `cyan-500`
- Border: `blue-500/30`
- Shadow: `blue-500/20`
- Text: white

## Custom Gradients

For complete control over gradient colors:

```tsx
<GradientButton
  customGradient={{
    from: 'purple-500',
    to: 'pink-500',
    via: 'blue-500',  // Optional middle color
    direction: 'br'   // Optional direction override
  }}
  opacity="medium"
>
  Custom Gradient
</GradientButton>
```

## Gradient Directions

Available directions: `r` (right), `l` (left), `br` (bottom-right), `bl` (bottom-left), `tr` (top-right), `tl` (top-left), `b` (bottom), `t` (top)

```tsx
<GradientButton colorScheme="blue" direction="br">
  Diagonal Gradient
</GradientButton>
```

## Opacity Levels

Control the transparency of gradients:

- `subtle`: 20% background, 30% hover
- `medium`: 40% background, 50% hover
- `strong`: 60% background, 70% hover
- `solid`: 100% (default)

```tsx
<GradientButton colorScheme="blue" opacity="subtle">
  Subtle Button
</GradientButton>
```

## Icons

Add Lucide icons with left or right positioning:

```tsx
import { Play, Download } from 'lucide-react';

<GradientButton
  colorScheme="green"
  icon={Play}
  iconPosition="left"
>
  Start
</GradientButton>

<GradientButton
  colorScheme="blue"
  icon={Download}
  iconPosition="right"
>
  Download
</GradientButton>
```

## Loading State

Display a loading spinner:

```tsx
<GradientButton
  colorScheme="blue"
  loading={isLoading}
  onClick={handleSubmit}
>
  {isLoading ? 'Processing...' : 'Submit'}
</GradientButton>
```

## Disabled State

```tsx
<GradientButton
  colorScheme="blue"
  disabled={!isValid}
  onClick={handleSubmit}
>
  Submit
</GradientButton>
```

## Size Variants

Three size options available:

```tsx
<GradientButton colorScheme="blue" size="sm">Small</GradientButton>
<GradientButton colorScheme="blue" size="md">Medium</GradientButton>
<GradientButton colorScheme="blue" size="lg">Large</GradientButton>
```

Sizes include:
- `sm`: `px-3 py-1.5 text-sm`
- `md`: `px-4 py-2 text-base` (default)
- `lg`: `px-6 py-3 text-lg`

## Full Width

Make the button expand to fill its container:

```tsx
<GradientButton colorScheme="blue" fullWidth>
  Full Width Button
</GradientButton>
```

## Disable Animations

For performance or accessibility reasons:

```tsx
<GradientButton colorScheme="blue" animate={false}>
  No Animation
</GradientButton>
```

## Complete Example

```tsx
import { GradientButton } from '@/components/ui';
import { Zap } from 'lucide-react';

function CompleteExample() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await someAsyncOperation();
    setLoading(false);
  };

  return (
    <GradientButton
      onClick={handleClick}
      colorScheme="purple"
      icon={Zap}
      iconPosition="left"
      loading={loading}
      size="lg"
      disabled={false}
      fullWidth={false}
      animate={true}
      title="Execute action"
    >
      {loading ? 'Processing...' : 'Execute'}
    </GradientButton>
  );
}
```

## Migration from Inline Gradients

### Before:
```tsx
<button
  className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-lg text-white font-semibold shadow-lg"
  onClick={handleClick}
>
  Click Me
</button>
```

### After:
```tsx
<GradientButton
  colorScheme="pink"
  size="lg"
  onClick={handleClick}
>
  Click Me
</GradientButton>
```

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | Required | Button text content |
| `onClick` | `() => void` | - | Click handler |
| `colorScheme` | `GradientColorScheme` | `'blue'` | Predefined color scheme |
| `customGradient` | `CustomGradient` | - | Custom gradient config (overrides colorScheme) |
| `icon` | `LucideIcon` | - | Icon component |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Icon position |
| `direction` | `GradientDirection` | `'r'` | Gradient direction |
| `opacity` | `OpacityLevel` | `'solid'` | Opacity level |
| `disabled` | `boolean` | `false` | Disabled state |
| `loading` | `boolean` | `false` | Loading state (shows spinner) |
| `fullWidth` | `boolean` | `false` | Full width button |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |
| `className` | `string` | `''` | Additional CSS classes |
| `animate` | `boolean` | `true` | Enable Framer Motion animations |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Button type |
| `title` | `string` | - | Tooltip text |

## TypeScript Types

```typescript
export type GradientColorScheme =
  | 'blue' | 'indigo' | 'purple' | 'pink' | 'red' | 'orange'
  | 'amber' | 'yellow' | 'green' | 'emerald' | 'cyan' | 'slate' | 'gray';

export type GradientDirection = 'r' | 'l' | 'br' | 'bl' | 'tr' | 'tl' | 'b' | 't';

export type OpacityLevel = 'subtle' | 'medium' | 'strong' | 'solid';

export interface CustomGradient {
  from: string;
  to: string;
  via?: string;
  direction?: GradientDirection;
}
```

## Best Practices

1. **Use Predefined Schemes**: Stick to predefined color schemes for consistency
2. **Match Context**: Choose colors that match the action's context (e.g., red for delete, green for success)
3. **Loading States**: Always use the `loading` prop instead of manually managing loading UI
4. **Accessibility**: Provide meaningful `title` props for tooltips
5. **Size Consistency**: Use consistent sizes within related UI sections

## Common Use Cases

### Action Buttons
```tsx
<GradientButton colorScheme="blue" icon={Play}>Start</GradientButton>
<GradientButton colorScheme="red" icon={Trash}>Delete</GradientButton>
<GradientButton colorScheme="green" icon={Save}>Save</GradientButton>
```

### Submit Buttons
```tsx
<GradientButton
  type="submit"
  colorScheme="purple"
  loading={isSubmitting}
  disabled={!isValid}
>
  Submit Form
</GradientButton>
```

### Call-to-Action
```tsx
<GradientButton
  colorScheme="amber"
  size="lg"
  icon={Zap}
  fullWidth
>
  Get Started
</GradientButton>
```

## Troubleshooting

**Button not showing gradient**: Ensure Tailwind CSS is properly configured and the color scheme exists.

**Custom gradients not working**: Make sure color names match Tailwind's color palette (e.g., `purple-500`, not `purple`).

**Animation issues**: If animations are laggy, try setting `animate={false}` or reducing Framer Motion usage elsewhere.

## Related Components

- `ActionGroup`: Container for multiple related action buttons
- `BaseModal`: Modal dialogs that often contain gradient buttons
- `UniversalSelect`: Dropdown components that pair well with gradient buttons
