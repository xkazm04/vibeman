# ModalTransition Component

A reusable wrapper component that provides consistent Framer Motion animations for all modals in the application.

## Overview

The `ModalTransition` component standardizes modal entrance and exit animations, reducing CSS duplication and ensuring visual consistency across the entire application. It's particularly important for modal stacks like code review and AI review modals.

## Features

- **Multiple Animation Variants**: 6 predefined animation styles
- **Flexible Transitions**: 5 transition timing configurations
- **Customizable**: Support for custom variants and transitions
- **Accessibility**: Built-in backdrop click handling and event management
- **TypeScript**: Full type safety with exported types
- **Zero Config**: Works out of the box with sensible defaults

## Installation

The component is already available in the UI components library:

```typescript
import { ModalTransition, ModalContent } from '@/components/ui';
```

## Basic Usage

### Simple Modal

```tsx
import { ModalTransition, ModalContent } from '@/components/ui';

function MyModal({ isOpen, onClose }) {
  return (
    <ModalTransition isOpen={isOpen} onClose={onClose}>
      <ModalContent className="bg-gray-800 rounded-lg p-6 max-w-2xl">
        <h2>My Modal</h2>
        <p>Modal content goes here</p>
        <button onClick={onClose}>Close</button>
      </ModalContent>
    </ModalTransition>
  );
}
```

### With Different Variants

```tsx
// Spring animation (bouncy)
<ModalTransition isOpen={isOpen} onClose={onClose} variant="spring" transition="spring">
  <ModalContent className="bg-gray-800 rounded-lg p-6">
    Content
  </ModalContent>
</ModalTransition>

// Slide up from bottom
<ModalTransition isOpen={isOpen} onClose={onClose} variant="slideUp" transition="smooth">
  <ModalContent className="bg-gray-800 rounded-lg p-6">
    Content
  </ModalContent>
</ModalTransition>

// Fade only (no movement)
<ModalTransition isOpen={isOpen} onClose={onClose} variant="fade" transition="fast">
  <ModalContent className="bg-gray-800 rounded-lg p-6">
    Content
  </ModalContent>
</ModalTransition>
```

## Animation Variants

### 1. `default` (Default)
- Scale from 0.95 to 1
- Fade in/out
- Slight upward movement (20px)
- **Best for**: General purpose modals

### 2. `spring`
- Scale from 0.9 to 1
- Fade in/out
- Slight upward movement (20px)
- Bouncy spring physics
- **Best for**: Attention-grabbing modals, confirmations

### 3. `slideUp`
- Slides from bottom (100px)
- Fade in/out
- **Best for**: Mobile-like interactions, bottom sheets

### 4. `slideDown`
- Slides from top (100px)
- Fade in/out
- **Best for**: Notifications, dropdowns

### 5. `fade`
- Fade in/out only
- No scale or movement
- **Best for**: Minimal, subtle modals

### 6. `scale`
- Scale from 0.8 to 1
- Fade in/out
- No vertical movement
- **Best for**: Centered content, image previews

## Transition Types

### 1. `default`
- Duration: 0.2s
- Standard easing

### 2. `spring`
- Type: Spring physics
- Damping: 25
- Stiffness: 300
- Mass: 0.8
- **Natural, bouncy feel**

### 3. `smooth`
- Type: Tween
- Ease: easeInOut
- Duration: 0.3s
- **Smooth, elegant**

### 4. `fast`
- Duration: 0.15s
- **Quick, snappy**

### 5. `slow`
- Duration: 0.4s
- **Dramatic, deliberate**

## Props

### ModalTransition Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | **Required**. Whether the modal is visible |
| `onClose` | `() => void` | - | Callback when backdrop is clicked |
| `children` | `ReactNode` | - | **Required**. Modal content |
| `variant` | `ModalVariant` | `'default'` | Animation variant to use |
| `transition` | `ModalTransitionType` | `'default'` | Transition timing configuration |
| `backdropClassName` | `string` | - | Custom backdrop className |
| `modalClassName` | `string` | - | Custom modal container className |
| `showBackdrop` | `boolean` | `true` | Whether to show backdrop |
| `backdropBlur` | `boolean` | `true` | Whether backdrop should blur |
| `zIndex` | `number` | `50` | Z-index for the modal |
| `closeOnBackdropClick` | `boolean` | `true` | Whether clicking backdrop closes modal |
| `customVariants` | `object` | - | Custom animation variants |
| `customTransition` | `object` | - | Custom transition config |

### ModalContent Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | **Required**. Content to render |
| `className` | `string` | - | CSS classes for the content wrapper |
| `onClick` | `(e: MouseEvent) => void` | - | Click handler |

## Advanced Usage

### Custom Variants

```tsx
const customVariants = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  modal: {
    initial: { opacity: 0, x: -100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 100 },
  },
};

<ModalTransition
  isOpen={isOpen}
  onClose={onClose}
  customVariants={customVariants}
  customTransition={{ duration: 0.5 }}
>
  <ModalContent className="...">Content</ModalContent>
</ModalTransition>
```

### No Backdrop

```tsx
<ModalTransition isOpen={isOpen} onClose={onClose} showBackdrop={false}>
  <ModalContent className="...">Content</ModalContent>
</ModalTransition>
```

### Prevent Close on Backdrop Click

```tsx
<ModalTransition
  isOpen={isOpen}
  onClose={onClose}
  closeOnBackdropClick={false}
>
  <ModalContent className="...">
    Content with manual close button only
  </ModalContent>
</ModalTransition>
```

### Custom Z-Index for Stacking Modals

```tsx
// First modal
<ModalTransition isOpen={isOpen1} onClose={onClose1} zIndex={50}>
  <ModalContent className="...">First Modal</ModalContent>
</ModalTransition>

// Second modal (on top)
<ModalTransition isOpen={isOpen2} onClose={onClose2} zIndex={60}>
  <ModalContent className="...">Second Modal</ModalContent>
</ModalTransition>
```

## Migration Guide

### From BaseModal

**Before:**
```tsx
<BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
  <div className="p-6">Content</div>
</BaseModal>
```

**After:**
```tsx
<ModalTransition isOpen={isOpen} onClose={onClose}>
  <ModalContent className="bg-gray-800 rounded-lg p-6 max-w-4xl">
    Content
  </ModalContent>
</ModalTransition>
```

### From UniversalModal

**Before:**
```tsx
<UniversalModal
  isOpen={isOpen}
  onClose={onClose}
  title="My Modal"
  icon={Sparkles}
>
  <div>Content</div>
</UniversalModal>
```

**After:**
```tsx
<ModalTransition isOpen={isOpen} onClose={onClose} variant="spring" transition="spring">
  <ModalContent className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700/40 p-6 max-w-4xl">
    <div className="flex items-center space-x-3 mb-4">
      <Sparkles className="w-5 h-5" />
      <h2 className="text-xl font-semibold">My Modal</h2>
    </div>
    <div>Content</div>
  </ModalContent>
</ModalTransition>
```

## Demo

A live demo component is available:

```tsx
import { ModalTransitionDemo } from '@/components/ui';

// In your page or component
<ModalTransitionDemo />
```

This will render an interactive showcase of all animation variants.

## Best Practices

### 1. Choose the Right Variant
- Use `default` for most modals
- Use `spring` for confirmations and important actions
- Use `slideUp` for mobile-like bottom sheets
- Use `fade` for subtle, non-intrusive modals

### 2. Match Transitions to Variants
- Pair `spring` variant with `spring` transition
- Use `fast` transition for simple modals
- Use `smooth` or `slow` for complex content

### 3. Consistent Styling
- Always use `ModalContent` to wrap your content
- Apply consistent background colors and borders
- Match the existing design system (glassmorphism, gradients)

### 4. Accessibility
- Always provide an `onClose` handler
- Include a visible close button
- Use appropriate z-index for modal stacking

### 5. Performance
- Avoid nesting too many animated elements inside the modal
- Use `AnimatePresence` mode="wait" only when necessary
- Prefer `fast` or `default` transitions for complex modals

## Examples in Codebase

### Code Review Modal
Location: `src/app/reviewer/CodeReviewModal.tsx`

Could be refactored to:
```tsx
<ModalTransition isOpen={isOpen} onClose={onClose} variant="default" zIndex={99999}>
  <ModalContent className="h-full w-full bg-slate-900 border-l border-slate-700">
    {/* Modal content */}
  </ModalContent>
</ModalTransition>
```

### Idea Detail Modal
Location: `src/app/features/Ideas/components/IdeaDetailModal.tsx`

Already uses custom animations, could be refactored to:
```tsx
<ModalTransition isOpen={true} onClose={onClose} variant="spring" transition="spring">
  <ModalContent className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700/40 shadow-2xl max-h-[90vh] overflow-y-auto">
    {/* Modal content */}
  </ModalContent>
</ModalTransition>
```

## TypeScript Types

```typescript
import type { ModalVariant, ModalTransitionType } from '@/components/ui';

// Available variants
type ModalVariant = 'default' | 'spring' | 'slideUp' | 'slideDown' | 'fade' | 'scale';

// Available transitions
type ModalTransitionType = 'default' | 'spring' | 'smooth' | 'fast' | 'slow';
```

## API Reference

### Exported Values

```typescript
// Component
export const ModalTransition: React.FC<ModalTransitionProps>;
export const ModalContent: React.FC<ModalContentProps>;

// Variants and transitions (for custom use)
export const modalVariants: Record<ModalVariant, Variants>;
export const modalTransitions: Record<ModalTransitionType, TransitionConfig>;

// Demo component
export const ModalTransitionDemo: React.FC;
```

## Troubleshooting

### Modal doesn't animate
- Ensure `isOpen` prop changes between renders
- Check that Framer Motion is installed: `npm install framer-motion`

### Backdrop click doesn't close modal
- Verify `closeOnBackdropClick` is `true` (default)
- Ensure `onClose` callback is provided

### Modal content is not styled
- Wrap content in `ModalContent` component
- Apply appropriate className with background, border, and padding

### Z-index issues with multiple modals
- Use different `zIndex` values for each modal
- Increment by 10+ to ensure proper stacking

## Future Enhancements

Potential improvements:
- Keyboard navigation support (Tab trapping)
- Focus management
- Scroll lock for body when modal is open
- Gesture-based dismissal for mobile
- Portal rendering option
- Preset theme variants (dark, light, glass)

## Related Components

- `BaseModal` - Legacy modal component
- `UniversalModal` - Feature-rich modal with header/footer
- `DynamicModalShell` - Dynamic modal system
- `AnimatePresence` - Framer Motion primitive

## Support

For issues or questions:
1. Check this documentation
2. View the demo: `<ModalTransitionDemo />`
3. Review example implementations in the codebase
4. Check Framer Motion documentation: https://www.framer.com/motion/
