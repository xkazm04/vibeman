# Blueprint Scan Error Handling

## Overview

The Blueprint onboarding system implements comprehensive graceful degradation to handle scan failures without blocking the entire onboarding flow. This document outlines the error handling strategy implemented across the system.

## Architecture

### 1. Multi-Layer Error Handling

The system implements error handling at multiple layers:

#### Layer 1: Scan Function Level
Each scan function (`blueprintBuildScan.ts`, `blueprintContextsScan.ts`, etc.) includes:
- Input validation (project existence, required parameters)
- Try-catch blocks around network requests
- Try-catch blocks around adapter initialization
- Try-catch blocks around adapter execution
- Fallback to `undefined` data on any failure

#### Layer 2: Scan Execution Level
`DarkBlueprintLayout.tsx` (`handleScan` function, lines 175-297):
- Wraps all scan execution in try-catch (lines 223-231)
- Converts exceptions to failed results
- Calls `failScan()` to update store with error state
- Continues processing other scans asynchronously

#### Layer 3: Store Level
`blueprintStore.ts` provides error state management:
- `hasError`: Boolean flag per scan
- `errorMessage`: Error details per scan
- `failScan(error)`: Updates error state
- `clearScanError(scanId)`: Clears error for retry
- `getFailedScans()`: Returns all failed scans

#### Layer 4: UI Level
`ScanErrorBanner.tsx` displays errors to users:
- Shows all failed scans with error messages
- Provides retry buttons for each failed scan
- Allows dismissing errors
- Animated entrance/exit with Framer Motion

## Error Flow

```
User clicks scan button
  ↓
handleScan() called in DarkBlueprintLayout
  ↓
startScan(scanId) - marks scan as running
  ↓
Execute scan function (e.g., executeBuildScan())
  ├─ Network error → return { success: false, error: "...", data: undefined }
  ├─ File error → return { success: false, error: "...", data: undefined }
  ├─ Parsing error → return { success: false, error: "...", data: undefined }
  └─ Success → return { success: true, data: {...} }
  ↓
If result.success === false:
  └─ failScan(errorMsg) - updates store with error
     └─ ScanErrorBanner displays error with retry button
  ↓
If result.success === true:
  └─ completeScan() - marks scan complete
     └─ buildDecisionData() - creates decision for user
```

## Key Features

### 1. Non-Blocking Execution
Scans run asynchronously in the background (line 202 in DarkBlueprintLayout):
```typescript
(async () => {
  // Scan execution
})();
// Returns immediately - scan runs in background
```

This allows:
- Multiple scans to run concurrently
- One scan failure doesn't block others
- UI remains responsive during scans

### 2. Fallback Data
All scan functions return `undefined` for `data` on failure:
```typescript
return {
  success: false,
  error: 'Descriptive error message',
  data: undefined, // Fallback placeholder
};
```

This ensures:
- Type safety maintained
- No null pointer exceptions
- Clear indication of missing data

### 3. Error Persistence
Errors are stored in `blueprintStore` with:
- `lastRun`: Timestamp of scan attempt
- `hasError`: Boolean flag
- `errorMessage`: User-friendly error description

This enables:
- Retry functionality
- Error history tracking
- Status indicators in UI

### 4. User Control
`ScanErrorBanner` provides:
- **Retry button**: Clears error and re-executes scan
- **Dismiss button**: Hides error without retrying
- **Clear error messages**: Shows what went wrong

## Test Coverage

All interactive elements include `data-testid` attributes for automated testing:

### ScanErrorBanner
- `scan-error-banner-container`: Container for all error banners
- `scan-error-banner-{scanName}`: Individual error banner
- `retry-scan-{scanName}-btn`: Retry button for specific scan
- `dismiss-error-{scanName}-btn`: Dismiss button for specific scan

### DarkBlueprintLayout
- `blueprint-layout`: Main layout container
- `blueprint-main-content`: Content area
- `blueprint-column-grid`: Column grid (legacy layout)
- `context-selector-modal`: Context selector modal

## Error Types Handled

### Network Errors
- API unavailable
- Timeout
- Connection refused
- CORS errors

### File Errors
- Missing project files
- Permission denied
- Invalid file format
- Corrupted files

### Parse Errors
- Invalid JSON response
- Malformed data structures
- Type mismatches

### Adapter Errors
- Unsupported framework
- Missing dependencies
- Configuration errors

## Examples

### Example 1: Network Failure in Vision Scan
```typescript
// blueprintVisionScan.ts
try {
  response = await fetch('/api/projects/ai-docs', {...});
} catch (networkError) {
  console.error('[VisionScan] Network error:', networkError);
  return {
    success: false,
    error: `Vision scan network error: ${networkError.message}`,
    data: undefined,
  };
}
```

Result:
- Vision scan fails
- Error banner appears with message
- Other scans (build, structure, contexts) continue
- User can retry vision scan when network recovers

### Example 2: Missing Context for Photo Scan
```typescript
if (!contextId) {
  return {
    success: false,
    error: 'No context ID provided',
    data: undefined,
  };
}
```

Result:
- Photo scan fails gracefully
- Clear error message shown
- Onboarding flow continues
- User can select context and retry

## Best Practices

### For Scan Function Authors
1. **Validate inputs early**: Check for required parameters at function start
2. **Wrap external calls**: Use try-catch around fetch, file reads, etc.
3. **Provide context**: Include scan name in error messages
4. **Return consistent format**: Always return `ScanResult` with success flag
5. **Log errors**: Use console.error for debugging

### For UI Component Authors
1. **Handle loading states**: Show progress while scans run
2. **Display errors clearly**: Use ScanErrorBanner for consistency
3. **Provide actions**: Always offer retry or dismiss options
4. **Maintain responsiveness**: Don't block UI on scan execution
5. **Add test IDs**: Include data-testid on all interactive elements

## Future Enhancements

Potential improvements to the error handling system:

1. **Error Analytics**: Track error rates per scan type
2. **Auto-Retry**: Automatically retry transient errors (network glitches)
3. **Error Grouping**: Group similar errors across scans
4. **Detailed Diagnostics**: Provide troubleshooting steps per error type
5. **Partial Results**: Return partial data when some operations succeed

## Related Files

### Core Implementation
- `src/app/features/Onboarding/sub_Blueprint/store/blueprintStore.ts`
- `src/app/features/Onboarding/sub_Blueprint/DarkBlueprintLayout.tsx`
- `src/app/features/Onboarding/sub_Blueprint/components/ScanErrorBanner.tsx`

### Scan Functions
- `src/app/features/Onboarding/sub_Blueprint/lib/blueprintBuildScan.ts`
- `src/app/features/Onboarding/sub_Blueprint/lib/blueprintContextsScan.ts`
- `src/app/features/Onboarding/sub_Blueprint/lib/blueprintPhotoScan.ts`
- `src/app/features/Onboarding/sub_Blueprint/lib/blueprintStructureScan.ts`
- `src/app/features/Onboarding/sub_Blueprint/lib/blueprintVisionScan.ts`

### Adapter System
- `src/app/features/Onboarding/sub_Blueprint/lib/adapters/index.ts`
- `src/app/features/Onboarding/sub_Blueprint/lib/adapters/registry.ts`

---

**Note**: This error handling system was implemented as part of the "Graceful degradation of scan failures" requirement to support multi-technology scanning and improve overall product reliability.
