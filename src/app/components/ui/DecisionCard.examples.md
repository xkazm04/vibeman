# DecisionCard Usage Examples

The `DecisionCard` component is a reusable UI element for displaying decision points, configuration steps, and action panels throughout the application.

## Basic Import

```tsx
import DecisionCard, { DecisionCardConfig } from '@/app/components/ui/DecisionCard';
// Or from the barrel export:
import { DecisionCard, DecisionCardConfig } from '@/app/components/ui';
```

## Basic Usage

```tsx
import { Check, X, Settings } from 'lucide-react';

const config: DecisionCardConfig = {
  title: "Configure Build Settings",
  description: "Review and confirm the build configuration before proceeding.",
  severity: "info",
  icon: Settings,
  actions: [
    {
      label: "Cancel",
      icon: X,
      onClick: handleCancel,
      variant: "secondary"
    },
    {
      label: "Confirm",
      icon: Check,
      onClick: handleConfirm,
      variant: "primary"
    }
  ]
};

<DecisionCard config={config} />
```

## With Subtitle and Count Badge

```tsx
const config: DecisionCardConfig = {
  title: "Review Build Errors",
  subtitle: "Build Step",
  description: "Multiple build errors were detected. Review and fix them before proceeding.",
  severity: "error",
  icon: AlertCircle,
  count: 5, // Shows badge with count
  actions: [
    {
      label: "View Details",
      icon: Eye,
      onClick: viewDetails,
      variant: "primary"
    }
  ]
};
```

## Size Variants

```tsx
// Small size - for compact panels
<DecisionCard config={{ ...config, size: "sm" }} />

// Medium size (default) - for standard panels
<DecisionCard config={{ ...config, size: "md" }} />

// Large size - for prominent decision points
<DecisionCard config={{ ...config, size: "lg" }} />
```

## Severity Levels

```tsx
// Info (blue/cyan) - default, neutral information
<DecisionCard config={{ ...config, severity: "info" }} />

// Warning (yellow/amber) - caution, review needed
<DecisionCard config={{ ...config, severity: "warning" }} />

// Error (red/rose) - critical issues
<DecisionCard config={{ ...config, severity: "error" }} />

// Success (green/emerald) - positive confirmation
<DecisionCard config={{ ...config, severity: "success" }} />
```

## Action Button Variants

```tsx
const actions = [
  // Primary - main action (green gradient, shimmer effect)
  {
    label: "Continue",
    icon: ArrowRight,
    onClick: handleContinue,
    variant: "primary"
  },
  // Secondary - neutral action (gray)
  {
    label: "Cancel",
    icon: X,
    onClick: handleCancel,
    variant: "secondary"
  },
  // Danger - destructive action (red gradient)
  {
    label: "Delete",
    icon: Trash,
    onClick: handleDelete,
    variant: "danger"
  },
  // Success - positive action (cyan/blue gradient)
  {
    label: "Approve",
    icon: Check,
    onClick: handleApprove,
    variant: "success"
  }
];
```

## With Processing State

```tsx
const [isProcessing, setIsProcessing] = useState(false);

const handleSubmit = async () => {
  setIsProcessing(true);
  await performAction();
  setIsProcessing(false);
};

const config: DecisionCardConfig = {
  title: "Submit Configuration",
  description: "Finalize and submit your configuration.",
  icon: Settings,
  isProcessing, // Shows loading spinner on primary action
  actions: [
    {
      label: "Submit",
      icon: Check,
      onClick: handleSubmit,
      variant: "primary"
    }
  ]
};
```

## With Custom Content

```tsx
const config: DecisionCardConfig = {
  title: "Select Options",
  description: "Choose the configuration options below.",
  icon: Settings,
  customContent: (
    <div className="space-y-2">
      <label className="flex items-center gap-2">
        <input type="checkbox" />
        <span>Enable feature A</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" />
        <span>Enable feature B</span>
      </label>
    </div>
  ),
  actions: [...]
};
```

## Conditional Visibility

```tsx
const [isVisible, setIsVisible] = useState(true);

<DecisionCard
  config={{
    ...config,
    visible: isVisible,
    onClose: () => setIsVisible(false) // ESC key support
  }}
/>
```

## Accessibility Features

The component includes:
- **ARIA labels**: All interactive elements have proper labels
- **Keyboard navigation**: ESC key to close (when `onClose` is provided)
- **Focus management**: First action button receives focus on mount
- **Screen reader support**: Uses `aria-live="polite"` for dynamic content

```tsx
const config: DecisionCardConfig = {
  title: "Confirm Action",
  description: "This action cannot be undone.",
  icon: AlertTriangle,
  testId: "delete-confirmation-card", // Base test ID
  actions: [
    {
      label: "Cancel",
      icon: X,
      onClick: handleCancel,
      ariaLabel: "Cancel deletion", // Custom ARIA label
      testId: "cancel-delete-btn" // Custom test ID
    },
    {
      label: "Delete",
      icon: Trash,
      onClick: handleDelete,
      variant: "danger",
      ariaLabel: "Confirm deletion"
    }
  ],
  onClose: handleClose // ESC key support
};
```

## Disabled Actions

```tsx
const actions = [
  {
    label: "Submit",
    icon: Check,
    onClick: handleSubmit,
    variant: "primary",
    disabled: !isFormValid // Disable until form is valid
  }
];
```

## Integration Example: Wizard Step

```tsx
function WizardStep() {
  const [currentStep, setCurrentStep] = useState(0);

  const stepConfigs: DecisionCardConfig[] = [
    {
      title: "Step 1: Configure Build",
      subtitle: "Build Configuration",
      description: "Set up your build settings.",
      icon: Settings,
      count: 1,
      actions: [
        {
          label: "Next",
          icon: ArrowRight,
          onClick: () => setCurrentStep(1),
          variant: "primary"
        }
      ]
    },
    {
      title: "Step 2: Review Changes",
      subtitle: "Review",
      description: "Review your configuration before proceeding.",
      icon: Eye,
      count: 2,
      actions: [
        {
          label: "Back",
          icon: ArrowLeft,
          onClick: () => setCurrentStep(0),
          variant: "secondary"
        },
        {
          label: "Finish",
          icon: Check,
          onClick: handleFinish,
          variant: "primary"
        }
      ]
    }
  ];

  return <DecisionCard config={stepConfigs[currentStep]} />;
}
```

## Integration Example: Notification Panel

```tsx
function NotificationPanel({ notification }) {
  const config: DecisionCardConfig = {
    title: notification.title,
    description: notification.message,
    severity: notification.type,
    icon: notification.icon,
    size: "sm",
    actions: [
      {
        label: "Dismiss",
        icon: X,
        onClick: () => dismissNotification(notification.id),
        variant: "secondary"
      }
    ],
    testId: `notification-${notification.id}`
  };

  return <DecisionCard config={config} />;
}
```

## Styling Customization

```tsx
// Add custom classes
<DecisionCard
  config={{
    ...config,
    className: "mt-8 mb-4 shadow-2xl" // Additional Tailwind classes
  }}
/>
```

## Best Practices

1. **Use appropriate severity**: Match the severity to the context (error for failures, warning for cautions, info for neutral, success for confirmations)

2. **Provide clear actions**: Action labels should be clear and actionable ("Delete Item" not just "Delete")

3. **Use test IDs**: Always provide testId for automated testing

4. **Handle loading states**: Set `isProcessing` when performing async operations

5. **Accessibility**: Provide custom `ariaLabel` for actions when the label text isn't descriptive enough

6. **Size selection**: Use `sm` for sidebars, `md` for main content, `lg` for prominent decisions

7. **Don't nest**: This component is designed to be top-level; avoid nesting DecisionCards
