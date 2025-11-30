# Design Document: RefactorWizard Redesign

## Overview

This design document outlines the architectural changes required to transform the RefactorWizard from a modal-based layout to an embedded full-page layout, along with comprehensive refactoring of large components into smaller, modular pieces.

The redesign focuses on three main objectives:
1. **Layout Transformation**: Remove modal overlay pattern, enable full-page rendering within parent container
2. **Component Modularization**: Break down 8 large files (200+ lines) into focused sub-components
3. **Documentation Update**: Reflect new architecture in REFACTOR_WIZARD_OVERVIEW.md

## Architecture

### Current Architecture (Modal-Based)

```
┌─────────────────────────────────────────────────────────────┐
│ App Layout                                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Fixed Overlay (z-50, backdrop-blur)                     ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │ Modal Container (max-w-7xl, h-[90vh])               │││
│  │  │  ┌─────────┬───────────────────────────────────────┐│││
│  │  │  │ Sidebar │ Step Content                          ││││
│  │  │  │ Progress│                                       ││││
│  │  │  └─────────┴───────────────────────────────────────┘│││
│  │  └─────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture (Embedded Layout)

```
┌─────────────────────────────────────────────────────────────┐
│ App Layout                                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Parent Container (flex-1, full width/height)            ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │ RefactorWizardLayout (w-full, h-full, no overlay)   │││
│  │  │  ┌──────────────────────────────────────────────────┐││
│  │  │  │ WizardHeader                                     │││
│  │  │  ├─────────┬────────────────────────────────────────┤││
│  │  │  │ Sidebar │ WizardStepRouter                       │││
│  │  │  │ Progress│  └─> Current Step Component            │││
│  │  │  └─────────┴────────────────────────────────────────┘││
│  │  └─────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy After Refactoring

```
RefactorWizard/
├── RefactorWizardLayout.tsx          # Main layout (< 150 lines)
├── components/
│   ├── WizardHeader.tsx              # NEW: Header with title, mode toggle, close
│   ├── WizardStepRouter.tsx          # NEW: Step routing logic
│   ├── WizardProgress.tsx            # Existing: Sidebar progress
│   ├── sub_DSLBuilder/
│   │   ├── DSLBuilderLayout.tsx      # Refactored (< 150 lines)
│   │   ├── DSLBuilderHeader.tsx      # NEW: Header and validation
│   │   ├── DSLBuilderTabs.tsx        # NEW: Tab navigation
│   │   ├── DSLRulesList.tsx          # NEW: Rules sidebar
│   │   └── ... (existing sub-components)
│   └── sub_Execute/
│       ├── ExecuteBreakdown.tsx      # NEW: Package/batch breakdown
│       └── ExecuteSuccessMessage.tsx # NEW: Completion state
├── sub_WizardSteps/
│   ├── components/
│   │   ├── PackageStep.tsx           # Refactored (< 100 lines)
│   │   ├── sub_PackageStep/
│   │   │   ├── PackageGenerationView.tsx  # NEW
│   │   │   ├── PackageSelectionView.tsx   # NEW
│   │   │   └── PackageListItem.tsx        # NEW
│   │   ├── ScanStep.tsx              # Refactored (< 100 lines)
│   │   ├── sub_ScanStep/
│   │   │   ├── ScanVisualization.tsx      # NEW (extracted)
│   │   │   ├── ScanConfigView.tsx         # NEW
│   │   │   └── ScanProgressView.tsx       # NEW
│   │   ├── ReviewStep.tsx            # Refactored (< 100 lines)
│   │   ├── sub_ReviewStep/
│   │   │   ├── ReviewStatsGrid.tsx        # NEW
│   │   │   ├── ReviewFilters.tsx          # NEW
│   │   │   └── ReviewActionBar.tsx        # NEW
│   │   ├── ResultsStep.tsx           # Refactored (< 100 lines)
│   │   ├── sub_ResultsStep/
│   │   │   ├── ResultsSummaryBanner.tsx   # NEW
│   │   │   ├── ResultsStatsGrid.tsx       # NEW
│   │   │   └── ResultsNextSteps.tsx       # NEW
│   │   ├── SettingsStep.tsx          # Refactored (< 100 lines)
│   │   └── sub_SettingsStep/
│   │       ├── ScanGroupCard.tsx          # NEW
│   │       └── ScanGroupList.tsx          # NEW
```

## Components and Interfaces

### New Components

#### WizardHeader
```typescript
interface WizardHeaderProps {
  isDSLMode: boolean;
  onToggleDSLMode: () => void;
  onOpenDebtPrediction: () => void;
  onClose: () => void;
}
```
Responsibilities:
- Render wizard title and branding
- DSL mode toggle button
- Debt Prevention button
- Close button

#### WizardStepRouter
```typescript
interface WizardStepRouterProps {
  currentStep: WizardStep;
}
```
Responsibilities:
- Map step names to step components
- Handle step transitions with AnimatePresence
- Render current step component

#### PackageGenerationView
```typescript
interface PackageGenerationViewProps {
  selectedOppCount: number;
  isGenerating: boolean;
  llmProvider: string;
  onProviderChange: (provider: string) => void;
  onGenerate: () => void;
  onBack: () => void;
}
```

#### PackageSelectionView
```typescript
interface PackageSelectionViewProps {
  packages: RefactoringPackage[];
  selectedPackages: Set<string>;
  packageFilter: PackageFilter;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSelectFoundational: () => void;
  onFilterChange: (filter: Partial<PackageFilter>) => void;
  onContinue: () => void;
  onBack: () => void;
}
```

#### ScanVisualization
```typescript
interface ScanVisualizationProps {
  progress: number;
}
```
Responsibilities:
- Animated grid background
- Scanning beam animation
- Progress percentage display
- Floating particles effect

#### ScanConfigView
```typescript
interface ScanConfigViewProps {
  activeProject: Project | null;
  selectedFolders: string[];
  onFoldersChange: (folders: string[]) => void;
}
```

#### ScanProgressView
```typescript
interface ScanProgressViewProps {
  progress: number;
  progressMessage: string | null;
}
```

#### ReviewStatsGrid
```typescript
interface ReviewStatsGridProps {
  stats: {
    total: number;
    fileCount: number;
    critical: number;
    high: number;
  };
  selectedCount: number;
}
```

#### ReviewFilters
```typescript
interface ReviewFiltersProps {
  filterCategory: string;
  filterSeverity: string;
  onCategoryChange: (category: string) => void;
  onSeverityChange: (severity: string) => void;
}
```

#### ReviewActionBar
```typescript
interface ReviewActionBarProps {
  selectedCount: number;
  filteredCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onContinue: () => void;
  onSkipPackaging: () => void;
}
```

#### ResultsSummaryBanner
```typescript
interface ResultsSummaryBannerProps {
  packageCount: number;
  isDirectMode: boolean;
}
```

#### ResultsStatsGrid
```typescript
interface ResultsStatsGridProps {
  packageCount: number;
  totalIssues: number;
  totalFiles: number;
  foundationalPackages: number;
}
```

#### ResultsNextSteps
```typescript
interface ResultsNextStepsProps {
  isDirectMode: boolean;
}
```

#### ExecuteBreakdown
```typescript
interface ExecuteBreakdownProps {
  isDirectMode: boolean;
  items: Array<{
    id: string;
    name: string;
    issueCount: number;
    category?: string;
    impact?: string;
    executionOrder?: number;
  }>;
  createdFiles: string[];
}
```

#### ExecuteSuccessMessage
```typescript
interface ExecuteSuccessMessageProps {
  createdFiles: string[];
  isDirectMode: boolean;
}
```

#### DSLBuilderHeader
```typescript
interface DSLBuilderHeaderProps {
  validationErrors: ValidationError[];
  showLibrary: boolean;
  canExecute: boolean;
  onToggleLibrary: () => void;
  onExecute: () => void;
  onBack: () => void;
}
```

#### DSLBuilderTabs
```typescript
interface DSLBuilderTabsProps {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
}
```

#### DSLRulesList
```typescript
interface DSLRulesListProps {
  rules: TransformationRule[];
  selectedRuleId: string | null;
  onSelectRule: (id: string) => void;
  onAddRule: () => void;
  onDeleteRule: (id: string) => void;
}
```

#### ScanGroupCard
```typescript
interface ScanGroupCardProps {
  group: ScanTechniqueGroup;
  isSelected: boolean;
  onToggle: () => void;
}
```

#### ScanGroupList
```typescript
interface ScanGroupListProps {
  groups: ScanTechniqueGroup[];
  selectedGroups: Set<string>;
  onToggleGroup: (id: string) => void;
}
```

## Data Models

No changes to existing data models. The refactoring is purely structural and does not modify:
- `RefactorOpportunity`
- `RefactoringPackage`
- `WizardPlan`
- `RefactorSpec`
- `TransformationRule`

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Embedded Layout Structure
*For any* wizard state (open/closed, any step), the RefactorWizardLayout component SHALL NOT render with CSS classes containing "fixed", "inset-0", or "z-50" that would create an overlay.

**Validates: Requirements 1.1**

### Property 2: Progress Indicator Consistency
*For any* wizard step from the set {settings, scan, plan, review, package, execute, results}, the WizardProgress component SHALL highlight exactly one step as current and mark all preceding steps as completed.

**Validates: Requirements 2.3**

## Error Handling

### Component Loading Errors
- Each step component should handle its own loading states
- Use React Error Boundaries at the WizardStepRouter level to catch rendering errors
- Display user-friendly error messages with retry options

### State Synchronization
- Zustand store remains the single source of truth
- Components should gracefully handle undefined/null state values
- Use optional chaining and default values for defensive coding

## Testing Strategy

### Unit Testing
- Use Vitest as the test runner (already configured in project)
- Test individual sub-components in isolation
- Mock Zustand store for component tests
- Verify prop passing and event handling

### Property-Based Testing
- Use fast-check library for property-based tests
- Configure minimum 100 iterations per property test
- Tag each property test with: `**Feature: wizard-redesign, Property {number}: {property_text}**`

### Property Test Implementation

#### Property 1: Embedded Layout Structure
```typescript
// **Feature: wizard-redesign, Property 1: Embedded Layout Structure**
import { fc } from 'fast-check';
import { render } from '@testing-library/react';

test('RefactorWizardLayout never renders with overlay classes', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('settings', 'scan', 'plan', 'review', 'package', 'execute', 'results'),
      fc.boolean(), // isWizardOpen
      (step, isOpen) => {
        // Setup store with given state
        // Render component
        // Assert no fixed/inset-0/z-50 classes in container
      }
    ),
    { numRuns: 100 }
  );
});
```

#### Property 2: Progress Indicator Consistency
```typescript
// **Feature: wizard-redesign, Property 2: Progress Indicator Consistency**
import { fc } from 'fast-check';

test('WizardProgress highlights exactly one current step', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('settings', 'scan', 'plan', 'review', 'package', 'execute', 'results'),
      (currentStep) => {
        // Render WizardProgress with currentStep
        // Assert exactly one step has "current" styling
        // Assert all steps before currentStep have "completed" styling
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing
- Test step navigation flows
- Verify state persistence across step transitions
- Test DSL mode toggle behavior

### File Structure Validation
- Create a test that counts lines in refactored files
- Verify all new sub-component files exist
- Validate import/export structure
