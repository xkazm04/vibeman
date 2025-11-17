# Title Actions System

**Version:** 1.0
**Last Updated:** 2025-01-16

## Overview

The Title Actions system allows decision panels to display action buttons at the title level (top-right corner), making them always accessible regardless of scroll position.

---

## How It Works

### Flow Diagram

```
User clicks title action button
         ↓
WizardStepPanel triggers onClick
         ↓
DecisionPanel intercepts and wraps
         ↓
1. Calls original onClick (custom logic)
         ↓
2. Determines action type by variant
         ↓
3a. Primary → acceptDecision()
3b. Secondary + "Cancel" → rejectDecision()
         ↓
Decision removed from queue
         ↓
Panel closes / Next decision shows
```

---

## Implementation

### 1. Define Title Actions in Decision Data

```typescript
// In your scan's buildDecisionData()
const { Check, X } = require('lucide-react');

const titleActions = [
  {
    label: 'Cancel',
    icon: X,
    onClick: async () => {
      // Optional cleanup logic
      console.log('User cancelled');
    },
    variant: 'secondary' as const,
    testId: 'my-scan-cancel-btn',
  },
  {
    label: 'Accept',
    icon: Check,
    onClick: async () => {
      // Your custom logic here
      await performAction();

      // Can throw error to prevent closing
      if (validationFails) {
        throw new Error('Validation failed');
      }
    },
    variant: 'primary' as const,
    testId: 'my-scan-accept-btn',
  },
];

return {
  type: 'my-scan',
  title: 'Scan Results',
  description: 'Brief description',
  titleActions, // ← Add this
  onAccept: async () => { /* Fallback */ },
  onReject: async () => { /* Fallback */ },
};
```

### 2. DecisionPanel Auto-Wiring

**DecisionPanel automatically:**
- Wraps each titleAction onClick
- Calls decision queue methods based on variant
- Handles errors gracefully

```typescript
// DecisionPanel.tsx (automatic)
const enhancedTitleActions = currentDecision.titleActions?.map(action => ({
  ...action,
  onClick: async () => {
    try {
      await action.onClick(); // Your logic

      if (action.variant === 'primary') {
        await handleAccept(); // Closes decision
      } else if (action.variant === 'secondary' && label.includes('cancel')) {
        await rejectDecision(); // Closes decision
      }
    } catch (error) {
      // Error → decision stays open
      console.error('[DecisionPanel] Action failed:', error);
    }
  },
}));
```

### 3. WizardStepPanel Rendering

```tsx
// WizardStepPanel.tsx
<div className="flex items-start justify-between gap-4 mb-2">
  <h3>{title}</h3>

  {/* Title actions (top-right) */}
  {titleActions && (
    <div className="flex items-center gap-2 flex-shrink-0">
      {titleActions.map(action => (
        <button onClick={action.onClick} className="...">
          <action.icon />
          {action.label}
        </button>
      ))}
    </div>
  )}
</div>
```

---

## Variant Behavior

| Variant | Auto-Action | Use Case |
|---------|-------------|----------|
| `primary` | Calls `acceptDecision()` after onClick | Accept, Confirm, Create, Submit |
| `secondary` + "Cancel" | Calls `rejectDecision()` after onClick | Cancel, Dismiss, Close |
| `secondary` (other) | No auto-action | Custom actions |
| `danger` | No auto-action | Delete, Destructive actions |
| `success` | No auto-action | Custom success actions |

---

## Error Handling

### Preventing Decision Close

Throw an error from onClick to prevent the decision from closing:

```typescript
{
  label: 'Create Requirements',
  onClick: async () => {
    if (!hasSelections()) {
      alert('Please select at least one file');
      throw new Error('No selections'); // ← Prevents close
    }

    await createRequirements();
    // Success → decision will close
  },
  variant: 'primary',
}
```

### Validation Example

```typescript
const handleAccept = async () => {
  const selectedFiles = getSelectedFiles();

  // Validation
  if (selectedFiles.length === 0) {
    alert('Please select at least one action');
    throw new Error('No files selected');
  }

  // API call with error handling
  try {
    const response = await fetch('/api/create', {
      method: 'POST',
      body: JSON.stringify({ files: selectedFiles }),
    });

    if (!response.ok) {
      throw new Error('API call failed');
    }

    console.log('✅ Success');
  } catch (error) {
    alert(`Failed: ${error.message}`);
    throw error; // ← Prevents close
  }
};
```

---

## Example: Unused Code Scan

### Complete Implementation

```typescript
// blueprintUnusedScan.ts
export function buildDecisionData(result: ScanResult): DecisionData {
  const unusedFiles = result.unusedFiles || [];
  let fileSelections: Record<string, string> = {};

  const handleAccept = async () => {
    const cleanFiles = unusedFiles.filter(
      (_, i) => fileSelections[`file-${i}`] === 'clean'
    );
    const integrateFiles = unusedFiles.filter(
      (_, i) => fileSelections[`file-${i}`] === 'integrate'
    );

    // Validation
    if (cleanFiles.length === 0 && integrateFiles.length === 0) {
      alert('Please select at least one action');
      throw new Error('No files selected');
    }

    // Create cleanup requirement
    if (cleanFiles.length > 0) {
      const prompt = generateCleanupPrompt({ unusedFiles: cleanFiles });

      const response = await fetch('/api/claude-code/requirement', {
        method: 'POST',
        body: JSON.stringify({
          projectPath: activeProject.path,
          requirementName: `unused-cleanup-${Date.now()}`,
          content: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create cleanup requirement');
      }
    }

    // Create integration requirement
    if (integrateFiles.length > 0) {
      const prompt = generateIntegrationPrompt({ unusedFiles: integrateFiles });

      const response = await fetch('/api/claude-code/requirement', {
        method: 'POST',
        body: JSON.stringify({
          projectPath: activeProject.path,
          requirementName: `unused-integration-${Date.now()}`,
          content: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create integration requirement');
      }
    }

    console.log(`✅ Created ${cleanFiles.length} cleanup, ${integrateFiles.length} integration`);
  };

  const customContent = React.createElement(UnusedFileDecision, {
    unusedFiles,
    onSelectionChange: (selections) => {
      fileSelections = selections;
    },
  });

  const { Check, X } = require('lucide-react');
  const titleActions = [
    {
      label: 'Cancel',
      icon: X,
      onClick: async () => {
        console.log('Cancelled');
      },
      variant: 'secondary' as const,
      testId: 'unused-scan-cancel-btn',
    },
    {
      label: 'Create Requirements',
      icon: Check,
      onClick: handleAccept,
      variant: 'primary' as const,
      testId: 'unused-scan-accept-btn',
    },
  ];

  return {
    type: 'unused-scan-selection',
    title: 'Select Actions for Unused Files',
    description: 'Brief summary...',
    customContent,
    titleActions,
    onAccept: handleAccept,
    onReject: async () => {},
  };
}
```

---

## Visual Design

### Button Styles

**Primary (Accept):**
- Green gradient background
- Border with glow effect
- Hover: Lighter shade
- Processing: Spinner animation

**Secondary (Cancel):**
- Gray background
- Subtle border
- Hover: Slightly lighter
- No special effects

### Positioning

```
┌─────────────────────────────────────────────────────┐
│ Title Text                    [Cancel] [Accept]     │ ← Top-right
├─────────────────────────────────────────────────────┤
│ Description text here                               │
│                                                     │
│ [Custom content]                                    │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Always visible (no scrolling needed)
- ✅ Consistent position across decisions
- ✅ Clear visual hierarchy
- ✅ Accessible keyboard navigation

---

## Testing

### Test Cases

```typescript
it('should close decision when Cancel clicked', async () => {
  const { getByTestId } = render(<DecisionPanel />);

  const cancelBtn = getByTestId('my-scan-cancel-btn');
  fireEvent.click(cancelBtn);

  await waitFor(() => {
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});

it('should keep decision open on validation error', async () => {
  const { getByTestId } = render(<DecisionPanel />);

  const acceptBtn = getByTestId('my-scan-accept-btn');
  fireEvent.click(acceptBtn);

  await waitFor(() => {
    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByText(/please select/i)).toBeInTheDocument();
  });
});

it('should close decision after successful accept', async () => {
  const { getByTestId } = render(<DecisionPanel />);

  // Select files
  fireEvent.click(getByTestId('file-0-action-clean'));

  const acceptBtn = getByTestId('my-scan-accept-btn');
  fireEvent.click(acceptBtn);

  await waitFor(() => {
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
```

---

## Common Patterns

### Pattern 1: Simple Confirmation

```typescript
const titleActions = [
  {
    label: 'Cancel',
    icon: X,
    onClick: async () => {},
    variant: 'secondary',
  },
  {
    label: 'Confirm',
    icon: Check,
    onClick: async () => {
      await performAction();
    },
    variant: 'primary',
  },
];
```

### Pattern 2: Validation + API Call

```typescript
const titleActions = [
  {
    label: 'Cancel',
    icon: X,
    onClick: async () => {},
    variant: 'secondary',
  },
  {
    label: 'Submit',
    icon: Check,
    onClick: async () => {
      if (!validate()) {
        alert('Validation failed');
        throw new Error('Invalid');
      }

      const response = await fetch('/api/submit', { ... });
      if (!response.ok) {
        throw new Error('API failed');
      }
    },
    variant: 'primary',
  },
];
```

### Pattern 3: Multiple Actions

```typescript
const titleActions = [
  {
    label: 'Skip',
    icon: ChevronRight,
    onClick: async () => {
      // Skip to next
    },
    variant: 'secondary',
  },
  {
    label: 'Delete All',
    icon: Trash2,
    onClick: async () => {
      await deleteAll();
    },
    variant: 'danger',
  },
  {
    label: 'Accept Selected',
    icon: Check,
    onClick: async () => {
      await acceptSelected();
    },
    variant: 'primary',
  },
];
```

---

## Best Practices

### ✅ DO

1. **Use descriptive labels** - "Create Requirements" instead of "OK"
2. **Validate before API calls** - Throw errors to prevent closing
3. **Show user feedback** - Use alerts/toasts for errors
4. **Log success/failure** - Console logs for debugging
5. **Handle async properly** - Use async/await for all async operations
6. **Use appropriate variants** - Primary for main action, secondary for cancel

### ❌ DON'T

1. **Don't use generic labels** - "Submit", "OK", "Done"
2. **Don't silently fail** - Always inform user of errors
3. **Don't block UI** - Use async operations properly
4. **Don't forget error handling** - Always try/catch API calls
5. **Don't mix concerns** - Keep onClick focused on one responsibility

---

## Summary

The Title Actions system provides:

✅ **Always accessible buttons** at title level
✅ **Automatic decision queue integration** via DecisionPanel
✅ **Error handling** prevents closing on failure
✅ **Flexible variants** for different action types
✅ **Clean separation** between UI and logic
✅ **Consistent UX** across all decision types

Perfect for scans requiring user interaction before accepting/rejecting decisions!
