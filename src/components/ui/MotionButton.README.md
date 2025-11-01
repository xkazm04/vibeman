# MotionButton Component

A centralized, reusable button component with Framer Motion animations that consolidates all `motion.button` usage across the application.

## Features

- ✨ **Consistent Animations**: Predefined animation presets (default, subtle, bounce, lift)
- 🎨 **Multiple Color Schemes**: 12 color schemes matching app design language
- 🎭 **Style Variants**: Solid, outline, ghost, and glassmorphic styles
- 📏 **Flexible Sizing**: 5 size options (xs, sm, md, lg, xl)
- 🎯 **Icon Support**: Built-in icon support with automatic sizing
- ♿ **Accessible**: Built-in accessibility support with aria-label
- 🔄 **Loading State**: Integrated loading spinner
- 🚫 **Disabled State**: Proper disabled state handling
- 🎛️ **Customizable**: Override any animation parameter

## Basic Usage

```tsx
import { MotionButton } from '@/components/ui';
import { Trash2 } from 'lucide-react';

// Simple button
<MotionButton onClick={handleClick}>
  Click me
</MotionButton>

// With icon
<MotionButton
  icon={Trash2}
  colorScheme="red"
  onClick={handleDelete}
>
  Delete
</MotionButton>

// Icon only
<MotionButton
  icon={Plus}
  iconOnly
  colorScheme="green"
  aria-label="Add item"
  onClick={handleAdd}
/>
```

## Animation Presets

### Available Presets

- **`default`**: Scale 1.05, y: -1, tap: 0.95 (most common)
- **`subtle`**: Scale 1.02, tap: 0.98 (gentle animation)
- **`bounce`**: Scale 1.1, tap: 0.9 (more pronounced)
- **`lift`**: y: -2, tap: 0.95 (vertical lift effect)
- **`none`**: No animation

```tsx
<MotionButton animationPreset="bounce">
  Bouncy Button
</MotionButton>

<MotionButton animationPreset="subtle">
  Subtle Button
</MotionButton>
```

### Custom Animation

Override individual animation parameters:

```tsx
<MotionButton
  hoverScale={1.15}
  tapScale={0.85}
  hoverY={-3}
>
  Custom Animation
</MotionButton>
```

## Color Schemes

Available colors: `blue`, `cyan`, `indigo`, `purple`, `pink`, `red`, `orange`, `amber`, `yellow`, `green`, `emerald`, `slate`, `gray`

```tsx
// Action buttons
<MotionButton colorScheme="green">Accept</MotionButton>
<MotionButton colorScheme="red">Reject</MotionButton>
<MotionButton colorScheme="orange">Delete</MotionButton>

// Info buttons
<MotionButton colorScheme="blue">Info</MotionButton>
<MotionButton colorScheme="purple">Premium</MotionButton>
```

## Style Variants

### Solid
Gradient background with border (default for most action buttons)

```tsx
<MotionButton variant="solid" colorScheme="blue">
  Solid Button
</MotionButton>
```

### Outline
Transparent background with colored border

```tsx
<MotionButton variant="outline" colorScheme="cyan">
  Outline Button
</MotionButton>
```

### Ghost
Transparent background, no border (most subtle)

```tsx
<MotionButton variant="ghost" colorScheme="gray">
  Ghost Button
</MotionButton>
```

### Glassmorphic
Semi-transparent with backdrop blur

```tsx
<MotionButton variant="glassmorphic" colorScheme="purple">
  Glassmorphic
</MotionButton>
```

## Sizes

Available sizes: `xs`, `sm`, `md`, `lg`, `xl`

```tsx
<MotionButton size="xs">Extra Small</MotionButton>
<MotionButton size="sm">Small</MotionButton>
<MotionButton size="md">Medium</MotionButton>
<MotionButton size="lg">Large</MotionButton>
<MotionButton size="xl">Extra Large</MotionButton>
```

## Icon Support

### Icon with Text

```tsx
// Icon on left (default)
<MotionButton icon={Save} iconPosition="left">
  Save
</MotionButton>

// Icon on right
<MotionButton icon={ChevronRight} iconPosition="right">
  Next
</MotionButton>
```

### Icon Only

```tsx
<MotionButton
  icon={Settings}
  iconOnly
  aria-label="Open settings"
  colorScheme="gray"
  size="sm"
/>
```

### Custom Icon Size

```tsx
<MotionButton
  icon={Star}
  iconSize="w-6 h-6"
>
  Custom Icon Size
</MotionButton>
```

## States

### Loading State

```tsx
<MotionButton
  loading={isSubmitting}
  colorScheme="blue"
>
  {isSubmitting ? 'Saving...' : 'Save'}
</MotionButton>
```

### Disabled State

```tsx
<MotionButton
  disabled={!formValid}
  colorScheme="green"
>
  Submit
</MotionButton>
```

## Common Patterns

### Action Buttons Row

```tsx
<div className="flex items-center gap-2">
  <MotionButton
    icon={Check}
    colorScheme="green"
    variant="outline"
    size="sm"
    onClick={handleAccept}
  >
    Accept
  </MotionButton>

  <MotionButton
    icon={X}
    colorScheme="red"
    variant="outline"
    size="sm"
    onClick={handleReject}
  >
    Reject
  </MotionButton>
</div>
```

### Icon-Only Action Group

```tsx
<div className="flex items-center gap-1">
  <MotionButton
    icon={Edit}
    iconOnly
    aria-label="Edit"
    size="sm"
    onClick={handleEdit}
  />
  <MotionButton
    icon={Copy}
    iconOnly
    aria-label="Copy"
    size="sm"
    onClick={handleCopy}
  />
  <MotionButton
    icon={Trash2}
    iconOnly
    colorScheme="red"
    aria-label="Delete"
    size="sm"
    onClick={handleDelete}
  />
</div>
```

### Form Submit Button

```tsx
<MotionButton
  type="submit"
  form="my-form"
  loading={isSubmitting}
  disabled={!isValid}
  colorScheme="blue"
  variant="solid"
  fullWidth
>
  Submit Form
</MotionButton>
```

### Tinder-Style Action Buttons

```tsx
<div className="flex items-center justify-center gap-6">
  <MotionButton
    icon={X}
    iconOnly
    colorScheme="red"
    variant="outline"
    size="xl"
    animationPreset="bounce"
    aria-label="Reject"
    className="w-16 h-16 rounded-full border-2 shadow-lg shadow-red-500/20"
  />

  <MotionButton
    icon={Check}
    iconOnly
    colorScheme="green"
    variant="outline"
    size="xl"
    animationPreset="bounce"
    aria-label="Accept"
    className="w-16 h-16 rounded-full border-2 shadow-lg shadow-green-500/20"
  />
</div>
```

## Migration from motion.button

### Before

```tsx
<motion.button
  onClick={handleClick}
  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs"
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  <Trash2 className="w-3.5 h-3.5" />
  <span>Delete</span>
</motion.button>
```

### After

```tsx
<MotionButton
  icon={Trash2}
  colorScheme="red"
  variant="outline"
  size="sm"
  onClick={handleClick}
>
  Delete
</MotionButton>
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Button text content |
| `onClick` | `(e: MouseEvent) => void` | - | Click handler |
| `icon` | `LucideIcon` | - | Icon component |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Icon position |
| `iconSize` | `string` | auto | Custom icon size class |
| `colorScheme` | `MotionButtonColorScheme` | `'gray'` | Color scheme |
| `variant` | `MotionButtonVariant` | `'ghost'` | Style variant |
| `size` | `MotionButtonSize` | `'md'` | Button size |
| `animationPreset` | `AnimationPreset` | `'default'` | Animation preset |
| `hoverScale` | `number` | - | Custom hover scale |
| `tapScale` | `number` | - | Custom tap scale |
| `hoverY` | `number` | - | Custom hover y offset |
| `disabled` | `boolean` | `false` | Disabled state |
| `loading` | `boolean` | `false` | Loading state |
| `fullWidth` | `boolean` | `false` | Full width button |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Button type |
| `title` | `string` | - | Tooltip text |
| `className` | `string` | `''` | Additional CSS classes |
| `aria-label` | `string` | - | Accessibility label |
| `iconOnly` | `boolean` | `false` | Icon-only mode |
| `form` | `string` | - | Form ID to associate with |

## Benefits

### Single Source of Truth
- All button animations defined in one place
- Easy to update hover/tap effects globally
- Consistent animation behavior across the app

### Reduced Duplication
- Eliminates repetitive motion.button code
- Standardized className patterns
- Automatic icon sizing

### Improved Maintainability
- Changes to button styles affect all instances
- Type-safe props with TypeScript
- Comprehensive documentation

### Better Developer Experience
- Simple, intuitive API
- Sensible defaults
- Easy customization when needed

## When to Use

Use `MotionButton` when you need:
- Standard action buttons (save, cancel, delete, etc.)
- Icon buttons with consistent animations
- Form submit buttons with loading states
- Any button that should have hover/tap animations

Use other components when you need:
- `IconButton`: Icon-only buttons with specific variants
- `AnimatedButton`: Text buttons with different animation styles
- `GradientButton`: Buttons with complex gradient backgrounds
- Plain `<button>`: No animations needed

## Examples in Codebase

See these files for real-world usage examples:
- `src/components/idea/IdeaDetailActions.tsx`
- `src/app/features/tinder/components/ActionButtons.tsx`
- `src/app/projects/ProjectsLayout.tsx`
