# IconButton Component

A standardized icon button component with built-in accessibility features, consistent sizing, and customizable color schemes.

## Features

- **Consistent Icon Sizing**: Standardized sizes (xs, sm, md, lg, xl) across all instances
- **Accessibility**: Required `aria-label` prop ensures screen reader support
- **Multiple Variants**: Solid, ghost, and outline styles
- **Color Schemes**: 13 predefined color schemes matching app design language
- **Animations**: Smooth hover and tap animations via Framer Motion
- **Loading States**: Built-in loading spinner
- **Disabled States**: Proper visual feedback for disabled buttons

## Usage

### Basic Example

```tsx
import { IconButton } from '@/components/ui';
import { Trash2 } from 'lucide-react';

<IconButton
  icon={Trash2}
  aria-label="Delete item"
  onClick={handleDelete}
  colorScheme="red"
/>
```

### With Tooltip

```tsx
<IconButton
  icon={Settings}
  aria-label="Settings"
  tooltip="Open settings panel"
  onClick={handleSettings}
  colorScheme="gray"
/>
```

### Different Sizes

```tsx
// Extra small
<IconButton icon={X} aria-label="Close" size="xs" />

// Small
<IconButton icon={X} aria-label="Close" size="sm" />

// Medium (default)
<IconButton icon={X} aria-label="Close" size="md" />

// Large
<IconButton icon={X} aria-label="Close" size="lg" />

// Extra large
<IconButton icon={X} aria-label="Close" size="xl" />
```

### Different Variants

```tsx
// Ghost (default) - transparent with hover effect
<IconButton
  icon={Edit}
  aria-label="Edit"
  variant="ghost"
  colorScheme="blue"
/>

// Outline - border with hover effect
<IconButton
  icon={Edit}
  aria-label="Edit"
  variant="outline"
  colorScheme="blue"
/>

// Solid - filled background with gradient
<IconButton
  icon={Edit}
  aria-label="Edit"
  variant="solid"
  colorScheme="blue"
/>
```

### Color Schemes

Available color schemes:
- `blue` (default)
- `cyan`
- `indigo`
- `purple`
- `pink`
- `red`
- `orange`
- `amber`
- `yellow`
- `green`
- `emerald`
- `slate`
- `gray`

```tsx
<IconButton icon={Trash2} aria-label="Delete" colorScheme="red" />
<IconButton icon={Check} aria-label="Approve" colorScheme="green" />
<IconButton icon={AlertCircle} aria-label="Warning" colorScheme="amber" />
```

### Loading State

```tsx
<IconButton
  icon={Save}
  aria-label="Save changes"
  loading={isSaving}
  onClick={handleSave}
/>
```

### Disabled State

```tsx
<IconButton
  icon={Send}
  aria-label="Send message"
  disabled={!canSend}
  onClick={handleSend}
/>
```

### Without Animation

```tsx
<IconButton
  icon={X}
  aria-label="Close"
  animate={false}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `LucideIcon` | **required** | The Lucide icon component to display |
| `aria-label` | `string` | **required** | Accessible label for screen readers |
| `onClick` | `() => void` | - | Click handler function |
| `tooltip` | `string` | - | Tooltip text (falls back to aria-label) |
| `colorScheme` | `IconButtonColorScheme` | `'gray'` | Color scheme for the button |
| `size` | `IconButtonSize` | `'md'` | Size variant |
| `variant` | `'solid' \| 'ghost' \| 'outline'` | `'ghost'` | Visual style variant |
| `disabled` | `boolean` | `false` | Disabled state |
| `loading` | `boolean` | `false` | Loading state (shows spinner) |
| `animate` | `boolean` | `true` | Enable hover/tap animations |
| `className` | `string` | `''` | Additional CSS classes |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Button type attribute |

## Comparison with ActionGroup

While `ActionGroup` is great for displaying multiple actions together with labels, `IconButton` is ideal for:
- Standalone icon buttons (close buttons, individual actions)
- Uniform sizing across the application
- Consistent accessibility with required aria-labels
- Simple, single-icon actions

## Migration Examples

### Before (scattered icon button)

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  onClick={handleClose}
  className="p-2 hover:bg-gray-700/40 rounded-lg"
>
  <X className="w-5 h-5 text-gray-400" />
</motion.button>
```

### After (using IconButton)

```tsx
<IconButton
  icon={X}
  aria-label="Close"
  onClick={handleClose}
  size="md"
  colorScheme="gray"
/>
```

### Benefits of Migration

1. **Accessibility**: Automatic aria-label requirement
2. **Consistency**: Standardized sizing (w-5 h-5 always means size="md")
3. **Less Code**: No need to manually add animations and hover states
4. **Maintainability**: Changes to icon button styling can be made in one place
5. **Type Safety**: TypeScript ensures correct prop usage

## Related Components

- **ActionGroup**: For groups of labeled action buttons
- **GradientButton**: For full-text buttons with gradients
- **AnimatedButton**: For general-purpose animated buttons

## Accessibility Notes

- The `aria-label` prop is **required** to ensure screen reader support
- If not provided, a TypeScript error will be shown
- The `tooltip` prop provides visual feedback on hover
- Disabled buttons include `opacity-50` and `cursor-not-allowed` for visual feedback
- All interactive states (hover, active, disabled) have clear visual indicators
