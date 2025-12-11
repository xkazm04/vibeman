# Experimental Lab (`/exp`)

A dedicated testing environment for feature modules before integration into the main application.

## Purpose

This page provides an isolated sandbox to:
- **Test UI/UX** of feature modules
- **Verify functionality** independently
- **Preview styling** and interactions
- **Iterate quickly** without affecting production code

## Available Modules

### 1. Parliament
**Path**: `/app/features/Parliament`

Multi-agent debate system for superior decision making. Displays agent reputation dashboard showing how AI agents perform in debates.

**Key Features**:
- Agent reputation tracking
- Performance metrics per agent
- Debate history
- Validation/rejection statistics

### 2. Security Intelligence
**Path**: `/app/features/SecurityIntelligence`

Cross-project security monitoring and vulnerability assessment dashboard.

**Key Features**:
- Aggregate risk scoring
- Vulnerability breakdown (Critical/High/Medium/Low)
- Security alerts management
- Stale branch detection
- Project-level security cards

### 3. Proposals
**Path**: `/app/features/Proposals`

Tinder-style proposal review system for code changes.

**Key Features**:
- Swipeable proposal cards
- Accept/decline actions
- Code generation integration
- Progress tracking

## Usage

### Access the Page
```
http://localhost:3000/exp
```

### Tab Navigation
Click on any tab to switch between modules:
- **Parliament** - View agent reputation and debate statistics
- **Security Intelligence** - Monitor security across all projects
- **Proposals** - Review pending code proposals

## Architecture

```
src/app/exp/
├── page.tsx                           # Main experimental page with tab switcher
├── components/
│   ├── ParliamentDashboard.tsx       # Parliament module wrapper
│   └── ProposalsDashboard.tsx        # Proposals module wrapper
└── README.md                          # This file
```

### Component Wrappers

Each dashboard wrapper:
1. **Imports** the feature module components
2. **Provides** necessary context/props
3. **Displays** info cards and metadata
4. **Explains** how the feature works

### Tab Switcher

The main page (`page.tsx`) uses:
- **Framer Motion** for smooth tab transitions
- **Layoutid animation** for active tab indicator
- **Lazy content loading** per tab

## Extending

To add a new module to test:

1. **Create a dashboard wrapper** in `components/`:
```tsx
// components/NewFeatureDashboard.tsx
export default function NewFeatureDashboard() {
  return (
    <div>
      {/* Header */}
      {/* Info cards */}
      {/* Feature component */}
    </div>
  );
}
```

2. **Add tab configuration** in `page.tsx`:
```tsx
const TABS = [
  // ... existing tabs
  {
    id: 'newfeature',
    label: 'New Feature',
    icon: YourIcon,
    description: 'Feature description',
  },
];
```

3. **Add tab content** in the render section:
```tsx
{activeTab === 'newfeature' && <NewFeatureDashboard />}
```

## Notes

- This is a **development-only** page for testing
- Changes here don't affect production features
- Feel free to experiment with different configurations
- Use this to validate before integrating into main app

## Related Documentation

- [Parliament Feature](../features/Parliament/README.md)
- [Security Intelligence](../features/SecurityIntelligence/README.md)
- [Proposals System](../features/Proposals/README.md)
