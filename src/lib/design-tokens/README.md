# Design Tokens

Centralized design system for consistent color usage, status states, and entity styling across the application.

## Overview

This design token system consolidates scattered color logic and provides a single source of truth for:
- Status colors (accepted, rejected, implemented, pending)
- Entity colors (context groups, custom entities)
- Consistent styling utilities via hooks and helper functions

## Files

- **`colors.ts`** - Core color definitions and utilities
- **`useEntityStyling.ts`** - React hook for entity styling
- **`index.ts`** - Main export file

## Usage Examples

### Basic Status Colors

```tsx
import { statusColors } from '@/lib/design-tokens/colors';

// Access status color configuration
const acceptedColor = statusColors.accepted; // { border, bg, text, hex, etc. }
```

### RGB from Hex Color

```tsx
import { getRGBFromHex } from '@/lib/design-tokens/colors';

const rgb = getRGBFromHex('#3b82f6'); // { r: 59, g: 130, b: 246 }
const shadowStyle = `0 0 12px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
```

### Status-Based Styling

```tsx
import { getStatusClasses, getStatusTextClass } from '@/lib/design-tokens/useEntityStyling';
import type { StatusType } from '@/lib/design-tokens/colors';

function IdeaCard({ idea }: { idea: Idea }) {
  const statusClasses = getStatusClasses(idea.status as StatusType);
  const textColor = getStatusTextClass(idea.status as StatusType);

  return (
    <div className={`rounded border ${statusClasses}`}>
      <span className={textColor}>{idea.status}</span>
    </div>
  );
}
```

### Entity Styling Hook

```tsx
import { useEntityStyling } from '@/lib/design-tokens/useEntityStyling';

function ContextGroupButton({ group, isSelected }: Props) {
  const { classes, rgb, styles, boxShadow } = useEntityStyling({
    color: group.color,
    isSelected,
  });

  return (
    <button
      className={classes}
      style={{
        ...styles,
        boxShadow: isSelected ? boxShadow.hover : boxShadow.default
      }}
    >
      {group.name}
    </button>
  );
}
```

## Status Types

```typescript
type StatusType = 'accepted' | 'rejected' | 'implemented' | 'pending';
```

### Status Color Scheme

- **Accepted** - Green (`#22c55e`)
- **Rejected** - Red (`#ef4444`)
- **Implemented** - Amber (`#f59e0b`)
- **Pending** - Gray (`#6b7280`)

## Migration Guide

### Before (Scattered Logic)

```tsx
// Duplicated function in multiple files
function getRGBFromHex(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), ... } : { r: 107, g: 114, b: 128 };
}

// Hardcoded status colors
function getStatusColor(status: string) {
  switch (status) {
    case 'accepted': return 'text-green-400';
    case 'rejected': return 'text-red-400';
    case 'implemented': return 'text-amber-400';
    default: return 'text-gray-400';
  }
}
```

### After (Design Tokens)

```tsx
import { getRGBFromHex } from '@/lib/design-tokens/colors';
import { getStatusTextClass } from '@/lib/design-tokens/useEntityStyling';
import type { StatusType } from '@/lib/design-tokens/colors';

// Use centralized utilities
const rgb = getRGBFromHex(color);
const statusColor = getStatusTextClass(status as StatusType);
```

## Benefits

1. **Single Source of Truth** - All color logic in one place
2. **Type Safety** - TypeScript types for status values
3. **Consistency** - Uniform visual language across components
4. **Theme Support** - Easy to add dark/light mode variants
5. **Maintainability** - Update colors once, apply everywhere

## Files Updated

Components migrated to use design tokens:
- `src/app/features/Ideas/components/ContextGroupSelector.tsx`
- `src/app/features/Ideas/components/ContextItemSelector.tsx`
- `src/app/features/Ideas/sub_Buffer/BufferItem.tsx`
- `src/components/idea/IdeaDetailModal.tsx`

Previously had duplicated `getRGBFromHex()` or hardcoded status colors.
