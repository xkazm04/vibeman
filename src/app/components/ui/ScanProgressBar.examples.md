# ScanProgressBar Usage Examples

## Basic Usage

### Determinate Mode (Known Total)
```tsx
import ScanProgressBar from '@/app/components/ui/ScanProgressBar';

<ScanProgressBar
  totalTokens={10000}
  processedTokens={3500}
  state="scanning"
  label="Processing scan..."
/>
```

### Indeterminate Mode (Unknown Total)
```tsx
<ScanProgressBar
  processedTokens={3500}
  state="scanning"
  label="Analyzing code..."
/>
```

## State Examples

### Scanning State
```tsx
<ScanProgressBar
  totalTokens={10000}
  processedTokens={3500}
  state="scanning"
  label="Scanning project..."
/>
```

### Success State
```tsx
<ScanProgressBar
  totalTokens={10000}
  processedTokens={10000}
  state="success"
  label="Scan complete!"
/>
```

### Error State
```tsx
<ScanProgressBar
  totalTokens={10000}
  processedTokens={4200}
  state="error"
  label="Scan failed"
/>
```

### Idle State
```tsx
<ScanProgressBar
  totalTokens={10000}
  processedTokens={0}
  state="idle"
  label="Ready to scan"
/>
```

## Customization

### Custom Height
```tsx
<ScanProgressBar
  totalTokens={10000}
  processedTokens={3500}
  state="scanning"
  height={12}
/>
```

### Hide Token Counts
```tsx
<ScanProgressBar
  totalTokens={10000}
  processedTokens={3500}
  state="scanning"
  showTokenCounts={false}
/>
```

### Hide Percentage
```tsx
<ScanProgressBar
  totalTokens={10000}
  processedTokens={3500}
  state="scanning"
  showPercentage={false}
/>
```

### Minimal (No Label or Stats)
```tsx
<ScanProgressBar
  totalTokens={10000}
  processedTokens={3500}
  state="scanning"
  showTokenCounts={false}
  showPercentage={false}
/>
```

## Integration with Existing Scan System

Replace the existing ProgressBar component usage in `ScanInitiator.tsx`:

```tsx
// Old
<ProgressBar items={scanQueue} totalIdeas={totalIdeas} type="scan" />

// New - Determinate mode
<ScanProgressBar
  totalTokens={scanMetadata?.totalTokens}
  processedTokens={scanMetadata?.processedTokens ?? 0}
  state={scanState}
  label="Scanning project..."
  showTokenCounts={true}
  showPercentage={true}
/>

// New - Indeterminate mode (when total is unknown)
<ScanProgressBar
  processedTokens={scanMetadata?.processedTokens ?? 0}
  state={scanState}
  label="Scanning project..."
/>
```

## Accessibility Features

The component includes full ARIA support:
- `role="progressbar"`
- `aria-valuenow` (current value, 0-100)
- `aria-valuemin` (always 0)
- `aria-valuemax` (always 100)
- `aria-label` (custom or default label)
- `aria-busy` (true when scanning)

## Animation Details

### Determinate Mode
- Smooth width transition as progress increases
- Shimmer effect on fill
- Background gradient animation

### Indeterminate Mode
- Sliding bar animation (40% width)
- Continuous left-to-right movement
- Shimmer effect on sliding bar
- "Processing..." pulsing text

## Color Schemes by State

- **scanning**: Blue/Cyan gradient (`from-blue-500 via-blue-400 to-cyan-500`)
- **success**: Green/Emerald gradient (`from-green-500 via-green-400 to-emerald-500`)
- **error**: Red/Orange gradient (`from-red-500 via-red-400 to-orange-500`)
- **idle**: Gray gradient (`from-gray-500 via-gray-400 to-gray-500`)
