# Modal Migration Guide

Guide for converting existing modals to use the new `ModalTransition` component.

## Why Migrate?

- **Consistent animations** across the entire application
- **Reduced code duplication** - no need to rewrite animation logic
- **Better maintainability** - animations managed in one place
- **TypeScript support** - full type safety for variants and transitions
- **Customizable** - easy to adjust animations project-wide

## Migration Patterns

### Pattern 1: From Custom AnimatePresence

**Before:**
```tsx
import { motion, AnimatePresence } from 'framer-motion';

function MyModal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-gray-800 rounded-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            Content
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**After:**
```tsx
import { ModalTransition, ModalContent } from '@/components/ui';

function MyModal({ isOpen, onClose }) {
  return (
    <ModalTransition isOpen={isOpen} onClose={onClose}>
      <ModalContent className="bg-gray-800 rounded-lg p-6">
        Content
      </ModalContent>
    </ModalTransition>
  );
}
```

**Changes:**
- Removed `AnimatePresence` import and usage
- Replaced custom `motion.div` backdrop with `ModalTransition`
- Replaced content wrapper with `ModalContent`
- Animation logic now handled by the component
- Event propagation automatically managed

---

### Pattern 2: From BaseModal

**Before:**
```tsx
import BaseModal from '@/components/ui/BaseModal';

function MyModal({ isOpen, onClose }) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
      <div className="p-6">
        <h2>Title</h2>
        <p>Content</p>
      </div>
    </BaseModal>
  );
}
```

**After:**
```tsx
import { ModalTransition, ModalContent } from '@/components/ui';

function MyModal({ isOpen, onClose }) {
  return (
    <ModalTransition isOpen={isOpen} onClose={onClose}>
      <ModalContent className="bg-gray-800 rounded-lg p-6 max-w-4xl">
        <h2>Title</h2>
        <p>Content</p>
      </ModalContent>
    </ModalTransition>
  );
}
```

**Changes:**
- Import changed from `BaseModal` to `ModalTransition` and `ModalContent`
- Added styling classes (background, rounded corners, padding) to `ModalContent`
- `maxWidth` moved to className

---

### Pattern 3: From UniversalModal (with header)

**Before:**
```tsx
import { UniversalModal } from '@/components/UniversalModal';
import { AlertTriangle } from 'lucide-react';

function MyModal({ isOpen, onClose }) {
  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Warning"
      subtitle="This action cannot be undone"
      icon={AlertTriangle}
      iconBgColor="from-red-800/60 to-red-900/60"
      iconColor="text-red-300"
    >
      <div>Content</div>
    </UniversalModal>
  );
}
```

**After:**
```tsx
import { ModalTransition, ModalContent } from '@/components/ui';
import { AlertTriangle, X } from 'lucide-react';

function MyModal({ isOpen, onClose }) {
  return (
    <ModalTransition isOpen={isOpen} onClose={onClose} variant="spring" transition="spring">
      <ModalContent className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700/40 shadow-2xl max-w-4xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-red-800/60 to-red-900/60 rounded-lg border border-red-600/30">
              <AlertTriangle className="w-5 h-5 text-red-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Warning</h2>
              <p className="text-sm text-gray-400">This action cannot be undone</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700/40 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div>Content</div>
      </ModalContent>
    </ModalTransition>
  );
}
```

**Changes:**
- Recreated header structure manually inside `ModalContent`
- Added glassmorphism styling to match existing design
- Used spring animation for important modal

---

### Pattern 4: Full-screen Modal (Code Review Style)

**Before:**
```tsx
function CodeReviewModal({ isOpen, onClose }) {
  return (
    <div className="fixed inset-0 z-[99999] bg-black/50 backdrop-blur-sm">
      <div className="h-full flex flex-col bg-slate-900 border-l border-slate-700">
        Content
      </div>
    </div>
  );
}
```

**After:**
```tsx
import { ModalTransition, ModalContent } from '@/components/ui';

function CodeReviewModal({ isOpen, onClose }) {
  return (
    <ModalTransition
      isOpen={isOpen}
      onClose={onClose}
      variant="fade"
      transition="fast"
      zIndex={99999}
    >
      <ModalContent className="h-full w-full bg-slate-900 border-l border-slate-700">
        Content
      </ModalContent>
    </ModalTransition>
  );
}
```

**Changes:**
- Wrapped in `ModalTransition` with fade animation (minimal for full-screen)
- Preserved z-index using component prop
- Used fast transition for responsiveness

---

## Step-by-Step Migration

### 1. Identify Modal Type

Determine which pattern your modal matches:
- Custom `AnimatePresence` + `motion.div`
- Using `BaseModal` component
- Using `UniversalModal` component
- Custom full-screen implementation

### 2. Update Imports

Replace old imports:
```tsx
// Remove these
import { motion, AnimatePresence } from 'framer-motion';
import BaseModal from '@/components/ui/BaseModal';
import { UniversalModal } from '@/components/UniversalModal';

// Add this
import { ModalTransition, ModalContent } from '@/components/ui';
```

### 3. Choose Animation Variant

Select appropriate variant:
- General modal → `variant="default"`
- Confirmation/important → `variant="spring"` + `transition="spring"`
- Bottom sheet → `variant="slideUp"`
- Notification → `variant="slideDown"`
- Full-screen → `variant="fade"` + `transition="fast"`

### 4. Restructure JSX

Wrap content in `ModalTransition` and `ModalContent`:
```tsx
<ModalTransition isOpen={isOpen} onClose={onClose} variant="...">
  <ModalContent className="...">
    {/* Your existing modal content */}
  </ModalContent>
</ModalTransition>
```

### 5. Apply Styling

Add appropriate classes to `ModalContent`:
```tsx
className="bg-gray-800 rounded-lg p-6 max-w-2xl border border-gray-700"
```

Match existing design patterns:
- Glassmorphism: `bg-gradient-to-br from-gray-900 to-gray-800`
- Borders: `border border-gray-700/40`
- Shadows: `shadow-2xl`
- Rounded corners: `rounded-2xl` or `rounded-lg`

### 6. Test

- Open/close animation works
- Backdrop click closes modal
- ESC key works (if implemented)
- z-index is correct for stacking
- Styling matches original

---

## Common Issues & Solutions

### Issue: Backdrop doesn't close modal

**Solution:** Ensure `onClose` is provided and `closeOnBackdropClick={true}` (default)

```tsx
<ModalTransition isOpen={isOpen} onClose={onClose}>
```

### Issue: Modal content is clicked when clicking inside

**Solution:** Use `ModalContent` component (it handles `stopPropagation`)

```tsx
<ModalContent className="...">
  Content
</ModalContent>
```

### Issue: Multiple modals have wrong stacking order

**Solution:** Set different `zIndex` values

```tsx
<ModalTransition isOpen={modal1} onClose={...} zIndex={50}>...</ModalTransition>
<ModalTransition isOpen={modal2} onClose={...} zIndex={60}>...</ModalTransition>
```

### Issue: Animation feels wrong

**Solution:** Try different variant/transition combinations

```tsx
// Too slow?
<ModalTransition variant="default" transition="fast">

// Not bouncy enough?
<ModalTransition variant="spring" transition="spring">

// Too dramatic?
<ModalTransition variant="fade" transition="fast">
```

### Issue: Need custom animation

**Solution:** Use `customVariants` and `customTransition`

```tsx
<ModalTransition
  isOpen={isOpen}
  onClose={onClose}
  customVariants={{
    backdrop: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    modal: { initial: { x: -100 }, animate: { x: 0 }, exit: { x: 100 } }
  }}
  customTransition={{ duration: 0.5 }}
>
```

---

## Checklist

Before submitting PR:

- [ ] Old modal component removed/replaced
- [ ] Imports updated
- [ ] Animation variant selected appropriately
- [ ] Styling matches original (or improved)
- [ ] Modal opens and closes smoothly
- [ ] Backdrop click works
- [ ] z-index correct for modal stacking
- [ ] TypeScript types are satisfied
- [ ] No console errors
- [ ] Tested in dev environment

---

## Examples in Codebase

### Already Migrated
- (None yet - this is the first implementation!)

### Good Candidates for Migration
1. `src/app/reviewer/CodeReviewModal.tsx` - Full-screen modal
2. `src/app/features/Ideas/components/IdeaDetailModal.tsx` - Detail modal with spring animation
3. `src/app/coder/Goals/GoalsAddModal.tsx` - Simple add modal
4. `src/app/projects/ProjectSetting/ProjectSelectionModal.tsx` - Selection modal
5. `src/app/runner/components/EmergencyKillModal.tsx` - Already uses UniversalModal

---

## Need Help?

1. Check documentation: `/docs/MODAL_TRANSITION.md`
2. View examples: `/src/components/ui/examples/ModalTransitionExample.tsx`
3. Run demo: Import `<ModalTransitionDemo />` to test variants
4. Ask the team or open an issue

---

## Performance Considerations

- ModalTransition is lightweight (minimal overhead)
- Uses Framer Motion's optimized animations
- No re-renders of children unless `isOpen` changes
- Backdrop and modal animate independently
- Safe to use for complex modal content

---

## Future Enhancements

Planned improvements to make migration easier:
- Preset theme variants (dark, light, glass)
- Focus management and tab trapping
- Scroll lock for body when modal is open
- Portal rendering option
- Preset modal templates (confirmation, alert, etc.)
