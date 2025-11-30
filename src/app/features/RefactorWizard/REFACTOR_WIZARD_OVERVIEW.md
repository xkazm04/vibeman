# RefactorWizard - Feature Overview

> **AI-Powered Code Analysis & Refactoring Planning System**
>
> Comprehensive static analysis tool that identifies code quality issues, generates refactoring recommendations, and creates structured Claude Code requirements for automated implementation.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Sub-Components Reference](#sub-components-reference)
3. [Core Capabilities](#core-capabilities)
4. [Analysis Techniques](#analysis-techniques)
5. [User Workflow](#user-workflow)
6. [Output & Integration](#output--integration)
7. [Technical Implementation](#technical-implementation)
8. [Current Limitations](#current-limitations)

---

## Architecture Overview

### Layout Pattern: Embedded Layout

The RefactorWizard uses an **embedded layout pattern** that renders within its parent container without fixed positioning or overlay backdrop. This approach:

- Utilizes full available page space for better content visibility
- Expands to fill parent container width and height
- Responsively adjusts dimensions on viewport resize
- Unmounts cleanly without affecting sibling components

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

### Directory Structure

```
RefactorWizard/
├── RefactorWizardLayout.tsx              # Main embedded layout container (<150 lines)
├── RefactorWizardLayout.test.tsx         # Layout property tests
├── REFACTOR_WIZARD_OVERVIEW.md           # This documentation
├── SCAN_TECHNIQUES_OVERVIEW.md           # Scan techniques documentation
│
├── components/                           # Shared wizard components
│   ├── WizardHeader.tsx                  # Header with title, mode toggle, close
│   ├── WizardStepRouter.tsx              # Step routing with AnimatePresence
│   ├── WizardProgress.tsx                # Sidebar progress indicator
│   ├── WizardProgress.test.tsx           # Progress component tests
│   ├── WizardConfigPanel.tsx             # Configuration panel
│   ├── ExecuteStep.tsx                   # Execute step component
│   ├── FolderSelector.tsx                # Folder selection UI
│   ├── HeroBadge.tsx                     # Celebration badge
│   ├── OpportunityCard.tsx               # Opportunity display card
│   ├── PackageCard.tsx                   # Package display card
│   ├── SuggestionCard.tsx                # Suggestion display card
│   ├── BatchItem.tsx                     # Batch item display
│   ├── BreakdownCard.tsx                 # Breakdown statistics card
│   ├── VirtualizedOpportunityList.tsx    # Virtualized opportunity list
│   ├── VirtualizedSuggestionList.tsx     # Virtualized suggestion list
│   │
│   ├── sub_DSLBuilder/                   # DSL Builder sub-components
│   │   ├── index.ts                      # Barrel export
│   │   ├── DSLBuilderLayout.tsx          # Main DSL layout (<150 lines)
│   │   ├── DSLBuilderHeader.tsx          # Header with validation status
│   │   ├── DSLBuilderTabs.tsx            # Tab navigation
│   │   ├── DSLRulesList.tsx              # Rules sidebar
│   │   ├── ExecutionConfig.tsx           # Execution configuration
│   │   ├── PreviewPanel.tsx              # Preview panel
│   │   ├── RuleEditor.tsx                # Rule editing
│   │   ├── RulesTabContent.tsx           # Rules tab content
│   │   ├── ScopeEditor.tsx               # Scope editing
│   │   ├── SpecInfoCard.tsx              # Spec information card
│   │   ├── SpecsLibrary.tsx              # Specs library browser
│   │   └── TemplateSelector.tsx          # Template selection
│   │
│   └── sub_Execute/                      # Execute step sub-components
│       ├── index.ts                      # Barrel export
│       ├── ExecuteBreakdown.tsx          # Package/batch breakdown display
│       └── ExecuteSuccessMessage.tsx     # Completion state message
│
├── sub_WizardSteps/                      # Wizard step components
│   ├── components/
│   │   ├── SettingsStep.tsx              # Settings step (<100 lines)
│   │   ├── ScanStep.tsx                  # Scan step (<100 lines)
│   │   ├── PlanStep.tsx                  # Plan step
│   │   ├── ReviewStep.tsx                # Review step (<100 lines)
│   │   ├── PackageStep.tsx               # Package step (<100 lines)
│   │   ├── ResultsStep.tsx               # Results step (<100 lines)
│   │   │
│   │   ├── sub_ScanStep/                 # Scan step sub-components
│   │   │   ├── index.ts                  # Barrel export
│   │   │   ├── ScanVisualization.tsx     # Animated scan display
│   │   │   ├── ScanConfigView.tsx        # Pre-scan configuration
│   │   │   └── ScanProgressView.tsx      # In-progress scan display
│   │   │
│   │   ├── sub_ReviewStep/               # Review step sub-components
│   │   │   ├── index.ts                  # Barrel export
│   │   │   ├── ReviewStatsGrid.tsx       # Statistics display
│   │   │   ├── ReviewFilters.tsx         # Category/severity filtering
│   │   │   └── ReviewActionBar.tsx       # Selection actions
│   │   │
│   │   ├── sub_ResultsStep/              # Results step sub-components
│   │   │   ├── index.ts                  # Barrel export
│   │   │   ├── ResultsSummaryBanner.tsx  # Success banner
│   │   │   ├── ResultsStatsGrid.tsx      # Statistics grid
│   │   │   └── ResultsNextSteps.tsx      # Next steps guidance
│   │   │
│   │   └── sub_SettingsStep/             # Settings step sub-components
│   │       ├── ScanGroupCard.tsx         # Individual scan group card
│   │       └── ScanGroupList.tsx         # Scan groups list
│   │
│   └── lib/                              # Step-specific utilities
│
└── lib/                                  # Core analysis logic
    ├── __tests__/                        # Unit tests
    │   ├── dependencyAnalyzer.test.ts
    │   └── packageGenerator.test.ts
    ├── aiAnalyzer.ts                     # LLM-powered deep analysis
    ├── contextLoader.ts                  # Context loading utilities
    ├── dependencyAnalyzer.ts             # Dependency analysis
    ├── dslExecutor.ts                    # DSL execution
    ├── dslTemplates.ts                   # DSL templates
    ├── dslTypes.ts                       # DSL type definitions
    ├── dslValidator.ts                   # DSL validation
    ├── fileScanner.ts                    # File scanning
    ├── packageGenerator.ts               # Package generation
    ├── patternDetectors.ts               # Rule-based pattern detection
    ├── refactorAnalyzer.ts               # Main orchestrator
    ├── requirementGenerator.ts           # Markdown generation
    ├── scanTechniques.ts                 # 20 technique definitions
    ├── scriptGenerator.ts                # Executable action generation
    ├── strategicRequirementGenerator.ts  # Strategic requirement generation
    ├── types.ts                          # TypeScript definitions
    └── wizardOptimizer.ts                # AI configuration planning
```

### Technology Stack

- **UI**: React + TypeScript, Framer Motion, Tailwind CSS
- **State**: Zustand with persistence
- **AI**: Multi-provider LLM support (Gemini, OpenAI, Anthropic, Ollama)
- **Scanning**: Plugin architecture with strategy pattern
- **Storage**: File-based requirement generation
- **Components**: 40+ modular React components organized by feature

---

## Sub-Components Reference

This section documents all sub-components created during the modularization refactoring.

### Layout Components

#### WizardHeader
```typescript
interface WizardHeaderProps {
  isDSLMode: boolean;
  onToggleDSLMode: () => void;
  onOpenDebtPrediction: () => void;
  onClose: () => void;
}
```
**Responsibilities:**
- Render wizard title and branding
- DSL mode toggle button
- Debt Prevention button
- Close button

#### WizardStepRouter
```typescript
type WizardStep = 'settings' | 'scan' | 'plan' | 'review' | 'package' | 'execute' | 'results';

interface WizardStepRouterProps {
  currentStep: WizardStep;
}
```
**Responsibilities:**
- Map step names to step components
- Handle step transitions with AnimatePresence
- Render current step component with animations

### Scan Step Sub-Components

#### ScanVisualization
```typescript
interface ScanVisualizationProps {
  progress: number;
}
```
**Responsibilities:**
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
**Responsibilities:**
- Pre-scan configuration UI
- Project info display
- Folder selector integration
- Analysis features overview

#### ScanProgressView
```typescript
interface ScanProgressViewProps {
  progress: number;
  progressMessage: string | null;
}
```
**Responsibilities:**
- In-progress scan visualization
- Progress bar display
- Phase indicators

### Review Step Sub-Components

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
**Responsibilities:**
- Display statistics cards (Total Issues, Files Affected, High Priority, Selected)

#### ReviewFilters
```typescript
interface ReviewFiltersProps {
  filterCategory: string;
  filterSeverity: string;
  onCategoryChange: (category: string) => void;
  onSeverityChange: (severity: string) => void;
}
```
**Responsibilities:**
- Category filter dropdown
- Severity filter dropdown

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
**Responsibilities:**
- Selection count display
- Quick Export button
- AI Packaging button
- Navigation actions

### Results Step Sub-Components

#### ResultsSummaryBanner
```typescript
interface ResultsSummaryBannerProps {
  packageCount: number;
  isDirectMode: boolean;
}
```
**Responsibilities:**
- Success banner with checkmark
- Summary text display

#### ResultsStatsGrid
```typescript
interface ResultsStatsGridProps {
  packageCount: number;
  totalIssues: number;
  totalFiles: number;
  foundationalPackages: number;
}
```
**Responsibilities:**
- Statistics grid (Strategic Packages, Total Issues, Files Affected, Foundational)

#### ResultsNextSteps
```typescript
interface ResultsNextStepsProps {
  isDirectMode: boolean;
}
```
**Responsibilities:**
- Next steps guidance card
- Numbered instructions

### Execute Step Sub-Components

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
**Responsibilities:**
- Package/batch breakdown list
- Creation status display
- Support for both direct mode (batches) and package mode

#### ExecuteSuccessMessage
```typescript
interface ExecuteSuccessMessageProps {
  createdFiles: string[];
  isDirectMode: boolean;
}
```
**Responsibilities:**
- Success message display
- File list
- Next steps guidance

### DSL Builder Sub-Components

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
**Responsibilities:**
- Header with validation status
- Library toggle button
- Execute button
- Back navigation

#### DSLBuilderTabs
```typescript
interface DSLBuilderTabsProps {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
}
```
**Responsibilities:**
- Tab navigation (Templates, Scope, Rules, Execution, Preview)

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
**Responsibilities:**
- Rules sidebar
- Add/delete/select functionality

### Settings Step Sub-Components

#### ScanGroupCard
```typescript
interface ScanGroupCardProps {
  group: ScanTechniqueGroup;
  isSelected: boolean;
  onToggle: () => void;
}
```
**Responsibilities:**
- Individual scan group card
- Checkbox, icon, techniques preview

#### ScanGroupList
```typescript
interface ScanGroupListProps {
  groups: ScanTechniqueGroup[];
  selectedGroups: Set<string>;
  onToggleGroup: (id: string) => void;
}
```
**Responsibilities:**
- Scan groups list with animations
- Uses ScanGroupCard for rendering

---

## Core Capabilities

### 1. Multi-Strategy Code Analysis

**Hybrid Approach**: Combines rule-based pattern detection with AI-powered deep analysis

**Supported Technologies**:
- ✅ Next.js (App Router, Image optimization, Server Components)
- ✅ React / React Native (Hooks, performance, accessibility)
- ✅ FastAPI (async patterns, Pydantic, dependency injection)
- ✅ Express.js (middleware, error handling, security)
- ✅ TypeScript (type safety, any types, unused imports)

### 2. Intelligent Scan Planning

**AI-Powered Configuration** (`wizardOptimizer.ts`):
- Detects project type from file structure
- Analyzes sample files (package.json, configs, largest files)
- Recommends relevant scan groups with confidence scoring
- Provides reasoning for recommendations

### 3. Comprehensive Issue Detection

**20 Scan Techniques** across 7 categories:

| Category | Priority | Techniques |
|----------|----------|------------|
| **Code Quality & Standards** | 10 | Console statements, Any types, Unused imports, Missing types |
| **Maintainability** | 9 | Large files, Duplication, Long functions, Complex conditionals, Magic numbers |
| **Security & Error Handling** | 10 | Missing error handling, Hardcoded credentials, API errors, Missing validation |
| **React & Components** | 8 | Hook dependencies, Component complexity, Prop drilling |
| **Performance** | 7 | Inefficient renders, Missing memoization |
| **Architecture** | 6 | Circular dependencies |
| **Testing** | 5 | Missing tests |

### 4. Metadata-Rich Findings

Each opportunity includes:
- **Category**: Type of issue (code-quality, security, performance, etc.)
- **Severity**: critical, high, medium, low
- **Effort**: small, medium, large
- **Impact**: Expected improvement when fixed
- **Files Affected**: List of file paths
- **Line Numbers**: Specific locations (when available)
- **Suggested Fix**: Code snippets or instructions
- **Auto-fix Available**: Boolean flag for automation

---

## Analysis Techniques

### Pattern-Based Detection

**File**: `lib/patternDetectors.ts`

**Detection Functions**:
```typescript
// Finds 3+ consecutive similar lines (30+ chars)
detectDuplication(content: string): number[]

// Functions exceeding 50 lines
detectLongFunctions(content: string): number[]

// console.log/warn/error/info/debug statements
detectConsoleStatements(content: string): number[]

// TypeScript 'any' type usage
detectAnyTypes(content: string): number[]

// Potentially unused import statements
detectUnusedImports(content: string): string[]
```

### Strategy-Based Detection

**File**: `src/lib/scan/ScanStrategy.ts`

**Plugin Architecture**:
1. `NextJSScanStrategy` - Next.js specific patterns
2. `FastAPIScanStrategy` - FastAPI best practices
3. `ExpressScanStrategy` - Express middleware & security
4. `ReactNativeScanStrategy` - RN performance & accessibility

Each strategy implements:
```typescript
interface ScanStrategy {
  detectOpportunities(files: ScannedFile[]): RefactorOpportunity[];
}
```

### AI-Powered Analysis

**File**: `lib/aiAnalyzer.ts`

**Configuration**:
- **Default Provider**: Gemini
- **Model**: gemini-2.0-flash-exp
- **Temperature**: 0.3 (balanced creativity/consistency)
- **Max Tokens**: 4000
- **Batch Size**: 5 files per request

**Analysis Focus**:
1. **Architectural Issues**: Coupling, separation of concerns, dependency management
2. **Performance Bottlenecks**: Re-renders, inefficient algorithms, memory leaks
3. **Security Vulnerabilities**: XSS, injection, exposure of sensitive data
4. **Code Quality**: Complexity, naming conventions, design patterns
5. **Maintainability**: Duplication, unclear logic, poor documentation

**Deduplication**: Removes duplicate findings based on category + files + description

---

## User Workflow

### 7-Step Wizard

#### Step 1: Settings (`SettingsStep.tsx`)
**Purpose**: Configure scan parameters

- Auto-detect project type
- Select scan technique groups (7 groups with checkboxes)
- Shows relevant groups based on project type
- Bulk actions: "Select All" / "Clear All"
- Visual grouping with icons and priorities

#### Step 2: Scan (`ScanStep.tsx`)
**Purpose**: Execute analysis

- Toggle AI analysis on/off
- Display active project info
- Start analysis button
- Real-time progress indicators
- Status: scanning → analyzing → completed

#### Step 3: Plan (`PlanStep.tsx`)
**Purpose**: Review AI-generated optimization plan

- Display AI recommendations
- Fine-tune selected scan groups
- Customize individual techniques
- Shows AI reasoning and confidence score

#### Step 4: Review (`ReviewStep.tsx`)
**Purpose**: Filter and select opportunities

- View all discovered opportunities
- Filter by category (8 types) and severity (4 levels)
- Select/deselect opportunities for execution
- **Virtualized list** for performance (140px item height)
- Metadata display: category, severity, effort, affected files
- Bulk selection controls

#### Step 5: Package (`PackageStep.tsx`)
**Purpose**: Group opportunities into strategic packages

- AI-powered package generation
- Package selection and filtering
- Quick actions for foundational packages
- Package statistics and metrics

#### Step 6: Execute (`ExecuteStep.tsx`)
**Purpose**: Generate requirement files

- Batch opportunities into groups of **20 issues**
- Generate markdown files for each batch
- Create files in `.claude/commands/refactor-batch-{N}.md`
- Progress tracking per batch
- Batch breakdown statistics

#### Step 7: Results (`ResultsStep.tsx`)
**Purpose**: Summary and next steps

- **Summary Statistics**: Total issues, files, batches, auto-fixable count
- **Category Breakdown**: Distribution chart
- **Severity Breakdown**: Priority distribution
- Complete list of selected suggestions
- **Next Steps Guide**: Instructions for Claude Code execution
- **Hero Badge**: Celebration UI

---

## Output & Integration

### Requirement File Format

**Location**: `{projectPath}/.claude/commands/refactor-batch-{N}.md`

**Structure**:
```markdown
# Refactoring Tasks - Batch N of M

> **⚠️ AUTOMATED REFACTORING BATCH**
> Generated by Vibeman Refactor Wizard

## Context
Project: **[Project Name]**
Total issues in this batch: **[Count]**

## Instructions
[Guidance for reviewing and implementing changes]

## Issues to Address

### 1. [Issue Title]
**Category:** [category]
**Severity:** [severity]
**Effort:** [effort]
**Estimated Time:** [time]

**Description:**
[Detailed description]

**Impact:**
[What improves]

**Files Affected:**
- `file1.ts`
- `file2.tsx`

**Line Numbers:**
- file1.ts: lines 10, 20, 30

**Suggested Fix:**
```
[Code or instructions]
```

✅ **Auto-fix available**

---

## Completion Checklist
- [ ] All N issues reviewed
- [ ] Applicable fixes implemented
- [ ] Tests passing
- [ ] Code committed
- [ ] Skipped issues documented

## Notes
[Implementation notes]
```

### Claude Code Integration

**Execution Flow**:
1. RefactorWizard generates `.claude/commands/refactor-batch-{N}.md`
2. User runs in Claude Code CLI:
   ```bash
   /refactor-batch-1
   /refactor-batch-2
   # etc.
   ```
3. Claude Code processes each batch sequentially
4. Tests and commits after each batch

**Pipeline Integration**:
- Uses `claudeCodePipeline.ts` for automated execution
- Supports fire-and-forget or polled execution
- Progress tracking and error handling
- Task queuing system integration

---

## Technical Implementation

### State Management

**Store**: `src/stores/refactorStore.ts` (Zustand with persistence)

**State Shape**:
```typescript
{
  // Analysis state
  analysisStatus: 'idle' | 'scanning' | 'analyzing' | 'generating-plan' | 'completed' | 'error'
  analysisProgress: number (0-100)
  analysisError: string | null

  // Opportunities
  opportunities: RefactorOpportunity[]
  selectedOpportunities: Set<string>
  filterCategory: 'all' | CategoryType
  filterSeverity: 'all' | SeverityLevel

  // Wizard configuration
  wizardPlan: WizardPlan | null
  selectedScanGroups: Set<string>
  techniqueOverrides: Map<string, boolean>

  // UI state
  isWizardOpen: boolean
  currentStep: WizardStep
  isDSLMode: boolean
}
```

**Persisted**: opportunities, wizardPlan, selectedScanGroups

### API Endpoints

**Analysis**:
```typescript
POST /api/refactor/analyze
{
  projectPath: string
  projectType: string
  useAI: boolean
  provider?: string
  model?: string
  selectedGroups: string[]
}
→ { opportunities, summary, wizardPlan }
```

**Requirement Creation**:
```typescript
POST /api/claude-code/requirement
{
  projectPath: string
  requirementName: string
  content: string
  overwrite: boolean
}
→ { success, fileName, filePath }
```

### Performance Optimizations

**Virtualized Lists**:
- `VirtualizedOpportunityList`: 140px items, 400px container
- `VirtualizedSuggestionList`: 120px items, 500px container
- Handles thousands of opportunities without lag

**AI Batching**:
- Analyzes files in groups of 5
- Prevents LLM context overflow
- Parallel processing for multiple batches

**Deduplication**:
- Removes duplicate AI findings
- Hash-based comparison (category + files + description)

### Design System

**Blueprint Theme**:
- Cyber/blueprint aesthetic with cyan/blue gradients
- Grid pattern overlays on hover
- Illuminated buttons with border glow effects
- Hand-written typography feel (Fira Code, monospace)
- Consistent spacing scale (4, 8, 12, 16, 24, 32, 48px)

**Accessibility**:
- All interactive elements have `data-testid` attributes
- Keyboard navigation support
- ARIA labels and roles
- Loading and error states
- High contrast color ratios

---

## Current Limitations

### 1. **Scattered Issue Batching**
- Issues are grouped into batches of 20 **arbitrarily**
- No strategic grouping by category, module, or dependency
- Requirements jump from one issue type to another
- **Impact**: Hard to maintain focus, inefficient implementation

### 2. **Lack of Systematic Refactoring**
- No high-level refactoring strategies proposed
- Missing pattern-based grouping (e.g., "all TypeScript any types")
- No module-based organization (e.g., "all auth issues")
- **Impact**: Doesn't promote codebase-wide improvements

### 3. **No Dependency Ordering**
- Issues are not ordered by dependency relationships
- Foundational changes (e.g., shared utilities) mixed with leaf changes
- **Impact**: Requires manual reordering for optimal implementation

### 4. **Limited Context in Requirements**
- Each batch has local context only
- Missing project-wide architectural goals
- No migration strategy or roadmap
- **Impact**: Claude Code lacks strategic direction

### 5. **Single-Pass Workflow**
- No iterative refinement
- Can't re-scan after partial implementation
- **Impact**: Can't track progress or validate improvements

### 6. **Manual Package Selection**
- User must manually select individual issues
- No automated package recommendations
- **Impact**: Time-consuming, easy to miss related issues

---

## Success Metrics

**Current Performance**:
- ✅ Scans 100+ files in <10 seconds (pattern detection)
- ✅ AI analysis of 50 files in ~30 seconds (with Gemini)
- ✅ Handles 1000+ opportunities with virtualized rendering
- ✅ Generates requirement files in <1 second per batch
- ✅ 90%+ accuracy in issue detection (based on manual review)

**User Experience**:
- ✅ 7-step wizard with clear progression
- ✅ Real-time progress indicators
- ✅ Responsive filtering and selection
- ✅ Professional Blueprint theme
- ✅ Comprehensive result summaries
- ✅ Modular component architecture (<100-150 lines per file)

---

## Future Vision

See `SYSTEMATIC_REFACTORING_PROPOSAL.md` for next-level enhancements:
- **Package-Based Grouping**: Strategic refactoring packages
- **AI-Powered Strategy**: High-level architectural recommendations
- **Dependency Ordering**: Smart execution sequencing
- **Module-Based Organization**: File/folder grouping
- **Migration Planning**: Multi-phase roadmaps
- **Progress Tracking**: Before/after metrics
