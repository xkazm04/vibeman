# MotionButton Quick Start Guide

Get started with MotionButton in 30 seconds! 🚀

## Installation

Already installed! Just import and use:

```tsx
import { MotionButton } from '@/components/ui';
```

## Basic Usage

```tsx
// Simple button
<MotionButton onClick={handleClick}>
  Click me
</MotionButton>

// With icon
import { Trash2 } from 'lucide-react';

<MotionButton icon={Trash2} colorScheme="red" onClick={handleDelete}>
  Delete
</MotionButton>

// Icon only
<MotionButton icon={Plus} iconOnly aria-label="Add" />
```

## Common Patterns

### Accept/Reject Buttons
```tsx
<MotionButton icon={Check} colorScheme="green" onClick={accept}>
  Accept
</MotionButton>
<MotionButton icon={X} colorScheme="red" onClick={reject}>
  Reject
</MotionButton>
```

### Form Submit
```tsx
<MotionButton
  type="submit"
  loading={isSubmitting}
  colorScheme="blue"
  fullWidth
>
  Submit
</MotionButton>
```

### Icon Toolbar
```tsx
<MotionButton icon={Edit} iconOnly size="sm" aria-label="Edit" />
<MotionButton icon={Copy} iconOnly size="sm" aria-label="Copy" />
<MotionButton icon={Trash2} iconOnly size="sm" colorScheme="red" aria-label="Delete" />
```

## Customization

### Change Colors
```tsx
colorScheme="blue"      // Blue
colorScheme="green"     // Green
colorScheme="red"       // Red
colorScheme="purple"    // Purple
// 12 colors total
```

### Change Style
```tsx
variant="solid"         // Gradient background (default)
variant="outline"       // Border only
variant="ghost"         // Transparent
variant="glassmorphic"  // Glassmorphic effect
```

### Change Size
```tsx
size="xs"   // Extra small
size="sm"   // Small
size="md"   // Medium (default)
size="lg"   // Large
size="xl"   // Extra large
```

### Change Animation
```tsx
animationPreset="default"  // Standard (default)
animationPreset="subtle"   // Gentle
animationPreset="bounce"   // Pronounced
animationPreset="lift"     // Vertical lift
animationPreset="none"     // No animation
```

## Props Cheat Sheet

| Prop | Example | Description |
|------|---------|-------------|
| `onClick` | `onClick={fn}` | Click handler |
| `icon` | `icon={Trash2}` | Lucide icon |
| `children` | `>Text</` | Button text |
| `colorScheme` | `colorScheme="red"` | Color theme |
| `variant` | `variant="outline"` | Style variant |
| `size` | `size="sm"` | Button size |
| `loading` | `loading={true}` | Show spinner |
| `disabled` | `disabled={true}` | Disable button |
| `iconOnly` | `iconOnly` | Icon without text |
| `aria-label` | `aria-label="Delete"` | Accessibility label |

## More Examples

See `MotionButton.examples.tsx` for 20+ real-world examples!

See `MotionButton.README.md` for complete documentation!

## Need Help?

1. Check `MotionButton.README.md` - Full documentation
2. Check `MotionButton.examples.tsx` - Live examples
3. Search codebase for existing usage: `grep -r "MotionButton" src/`

---

**That's it!** You're ready to create beautiful, animated buttons! 🎉
