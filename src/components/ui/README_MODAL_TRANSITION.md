# ModalTransition Quick Start

A reusable wrapper for consistent modal animations across the application.

## Basic Usage

```tsx
import { ModalTransition, ModalContent } from '@/components/ui';

<ModalTransition isOpen={isOpen} onClose={onClose}>
  <ModalContent className="bg-gray-800 rounded-lg p-6 max-w-2xl">
    <h2>My Modal</h2>
    <p>Content here</p>
  </ModalContent>
</ModalTransition>
```

## Animation Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| `default` | Scale + fade + slight upward movement | General purpose modals |
| `spring` | Bouncy spring animation | Confirmations, important actions |
| `slideUp` | Slides from bottom | Mobile-like bottom sheets |
| `slideDown` | Slides from top | Notifications, dropdowns |
| `fade` | Fade only, no movement | Subtle, minimal modals |
| `scale` | Scale only, no movement | Image previews, centered content |

## Transition Types

| Type | Description | Best For |
|------|-------------|----------|
| `default` | 0.2s standard | Most modals |
| `spring` | Physics-based bounce | Attention-grabbing |
| `smooth` | 0.3s easeInOut | Complex content |
| `fast` | 0.15s quick | Simple modals |
| `slow` | 0.4s deliberate | Dramatic effect |

## Common Patterns

### Confirmation Modal
```tsx
<ModalTransition isOpen={isOpen} onClose={onClose} variant="spring" transition="spring">
  <ModalContent className="bg-gray-900 rounded-2xl p-6 max-w-md">
    <h2>Confirm Action</h2>
    <p>Are you sure?</p>
    <button onClick={onClose}>Cancel</button>
    <button onClick={handleConfirm}>Confirm</button>
  </ModalContent>
</ModalTransition>
```

### Bottom Sheet
```tsx
<ModalTransition isOpen={isOpen} onClose={onClose} variant="slideUp" transition="smooth">
  <ModalContent className="bg-gray-900 rounded-t-2xl p-6 max-w-2xl w-full">
    Content
  </ModalContent>
</ModalTransition>
```

### Stacked Modals
```tsx
{/* First modal */}
<ModalTransition isOpen={modal1} onClose={() => setModal1(false)} zIndex={50}>
  <ModalContent className="...">First Modal</ModalContent>
</ModalTransition>

{/* Second modal (on top) */}
<ModalTransition isOpen={modal2} onClose={() => setModal2(false)} zIndex={60}>
  <ModalContent className="...">Second Modal</ModalContent>
</ModalTransition>
```

## Props Reference

### ModalTransition
- `isOpen` (required): boolean
- `onClose`: () => void
- `variant`: 'default' | 'spring' | 'slideUp' | 'slideDown' | 'fade' | 'scale'
- `transition`: 'default' | 'spring' | 'smooth' | 'fast' | 'slow'
- `zIndex`: number (default: 50)
- `showBackdrop`: boolean (default: true)
- `backdropBlur`: boolean (default: true)
- `closeOnBackdropClick`: boolean (default: true)

### ModalContent
- `children` (required): ReactNode
- `className`: string
- `onClick`: (e) => void

## Full Documentation

See `/docs/MODAL_TRANSITION.md` for complete API reference, migration guide, and advanced usage.

## Examples

See practical examples in:
- `/src/components/ui/ModalTransitionDemo.tsx` - Interactive demo
- `/src/components/ui/examples/ModalTransitionExample.tsx` - Code examples
