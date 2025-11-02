# StatusChip Component

A reusable, animated status indicator component that replaces `NeonStatusDisplay` and provides a consistent visual language across all features.

## Features

- **Multiple Status States**: idle, active, processing, error, success, warning
- **Theming Support**: phantom, midnight, shadow, default
- **Size Variants**: sm, md, lg
- **Optional Animation**: Smooth Framer Motion transitions
- **Accessibility**: ARIA-compliant with proper semantic markup
- **Intensity Control**: Dynamic visual effects based on intensity (0-1)
- **Icon Support**: Optional Lucide React icons
- **Fully Typed**: Complete TypeScript support

## Usage

### Basic Example

```tsx
import StatusChip from '@/app/components/ui/StatusChip';

function MyComponent() {
  return (
    <StatusChip
      status="idle"
      label="System Ready"
    />
  );
}
```

### With Icon and Theme

```tsx
import StatusChip from '@/app/components/ui/StatusChip';
import { Zap } from 'lucide-react';

function MyComponent() {
  return (
    <StatusChip
      status="active"
      label="Processing"
      icon={Zap}
      theme="midnight"
      animated={true}
      size="md"
    />
  );
}
```

### Processing State with Intensity

```tsx
import StatusChip from '@/app/components/ui/StatusChip';
import { Loader } from 'lucide-react';

function MyComponent() {
  const [volume, setVolume] = useState(0.5);

  return (
    <StatusChip
      status="processing"
      label="Processing Audio"
      icon={Loader}
      theme="phantom"
      animated={true}
      intensity={volume} // 0-1 scale
      size="lg"
    />
  );
}
```

### All Status States

```tsx
import StatusChip from '@/app/components/ui/StatusChip';

function StatusExamples() {
  return (
    <div className="space-y-2">
      <StatusChip status="idle" label="Idle" />
      <StatusChip status="active" label="Active" />
      <StatusChip status="processing" label="Processing" />
      <StatusChip status="error" label="Error" />
      <StatusChip status="success" label="Success" />
      <StatusChip status="warning" label="Warning" />
    </div>
  );
}
```

### Clickable Status Chip

```tsx
import StatusChip from '@/app/components/ui/StatusChip';

function MyComponent() {
  const handleClick = () => {
    console.log('Status clicked!');
  };

  return (
    <StatusChip
      status="idle"
      label="Click me"
      onClick={handleClick}
    />
  );
}
```

### Without Animation

```tsx
import StatusChip from '@/app/components/ui/StatusChip';

function MyComponent() {
  return (
    <StatusChip
      status="success"
      label="Static Status"
      animated={false}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `StatusChipState` | Required | Status state: idle, active, processing, error, success, warning |
| `label` | `string` | Required | Display text label |
| `icon` | `LucideIcon` | `undefined` | Optional icon from lucide-react |
| `theme` | `StatusChipTheme` | `'default'` | Theme variant: phantom, midnight, shadow, default |
| `animated` | `boolean` | `true` | Enable/disable animations |
| `size` | `StatusChipSize` | `'md'` | Size variant: sm, md, lg |
| `intensity` | `number` | `0.5` | Intensity for dynamic effects (0-1) |
| `className` | `string` | `''` | Additional CSS classes |
| `onClick` | `() => void` | `undefined` | Optional click handler |

## Status States

### idle
- **Color**: Green
- **Use Case**: System ready, waiting for input
- **Animation**: Slow, steady pulse

### active
- **Color**: Blue
- **Use Case**: Listening, capturing input
- **Animation**: Medium pulse with scan line

### processing
- **Color**: Orange
- **Use Case**: Computing, speaking, processing
- **Animation**: Fast pulse with particles (when intensity > 0.5)
- **Note**: Animation speed and particle count scale with `intensity` prop

### error
- **Color**: Red
- **Use Case**: Errors, failures
- **Animation**: Fast flashing with edge indicators

### success
- **Color**: Emerald
- **Use Case**: Completed successfully
- **Animation**: Moderate glow

### warning
- **Color**: Amber
- **Use Case**: Warnings, cautions
- **Animation**: Moderate pulse

## Themes

### phantom
- Purple tint overlay
- Accent color: `#a855f7`

### midnight
- Cyan tint overlay
- Accent color: `#22d3ee`

### shadow
- Red tint overlay
- Accent color: `#f87171`

### default
- Slate tint overlay
- Accent color: `#64748b`

## Size Variants

### sm
- Height: `h-6` (24px)
- Text: `text-xs`
- Icon: `w-3 h-3`
- Padding: `px-2 py-1`

### md
- Height: `h-8` (32px)
- Text: `text-sm`
- Icon: `w-4 h-4`
- Padding: `px-3 py-1.5`

### lg
- Height: `h-10` (40px)
- Text: `text-base`
- Icon: `w-5 h-5`
- Padding: `px-4 py-2`

## Animation Details

When `animated={true}`:
- **Background bars**: Animated glow effect with status-based colors
- **Theme overlay**: Pulsing radial gradient (if theme !== 'default')
- **Text shadow**: Dynamic neon glow that pulses
- **Icon**: Rotates for processing state, scales for error state
- **Scan line**: Moves left-to-right for processing/active states
- **Edge indicators**: Pulse for error state
- **Particles**: Spawn for processing state when intensity > 0.5

When `animated={false}`:
- Static appearance with no motion
- Still maintains status-based colors and styling

## Migrating from NeonStatusDisplay

If you're currently using `NeonStatusDisplay` from the Annette feature:

### Before
```tsx
import NeonStatusDisplay from '@/app/features/Annette/components/NeonStatusDisplay';

<NeonStatusDisplay
  message="Processing"
  theme="midnight"
  isSpeaking={true}
  isListening={false}
  isError={false}
  volume={0.7}
/>
```

### After
```tsx
import StatusChip from '@/app/components/ui/StatusChip';

<StatusChip
  status="processing"
  label="Processing"
  theme="midnight"
  animated={true}
  intensity={0.7}
/>
```

**Note**: `NeonStatusDisplay` is now a thin wrapper around `StatusChip` for backward compatibility.

## Design Decisions

1. **Tailwind CSS**: Uses utility classes for easy theming and customization
2. **Framer Motion**: Smooth, performant animations with hardware acceleration
3. **Lucide Icons**: Optional icon support for visual context
4. **Modular Design**: Each status has its own color scheme and animation pattern
5. **Accessibility**: Proper semantic HTML and ARIA attributes
6. **TypeScript**: Full type safety and autocomplete support

## Examples in Codebase

- **Annette Voice Panel**: `src/app/features/Annette/components/NeonStatusDisplay.tsx` (wrapper)
- **Annette Main Panel**: `src/app/features/Annette/components/AnnettePanel.tsx`

## Future Enhancements

Potential improvements:
- Custom color schemes
- More animation presets
- Badge count support
- Tooltip integration
- Sound feedback (for processing state)
