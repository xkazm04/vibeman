# Design Document: Unused Module Integration

## Overview

This design describes the integration of three unused feature modules (RefactorSuggestion, Proposals, Marketplace) into their respective target modules (RefactorWizard, Manager, reflector) within the Vibeman project. The integration follows a loosely-coupled architecture using adapter patterns, barrel exports, and graceful degradation to maximize code reuse while maintaining module independence.

## Architecture

### High-Level Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Vibeman Application                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌────────────────┐ │
│  │   RefactorWizard     │    │      Manager         │    │   reflector    │ │
│  │   (Target Module)    │    │   (Target Module)    │    │ (Target Module)│ │
│  │                      │    │                      │    │                │ │
│  │  ┌────────────────┐  │    │  ┌────────────────┐  │    │ ┌────────────┐ │ │
│  │  │ ScanStep       │  │    │  │ LogDetail      │  │    │ │ TotalView  │ │ │
│  │  │   ↓            │  │    │  │   ↓            │  │    │ │   ↓        │ │ │
│  │  │ SuggestionPanel│  │    │  │ ProposalPanel  │  │    │ │ PatternRec │ │ │
│  │  └────────────────┘  │    │  └────────────────┘  │    │ └────────────┘ │ │
│  └──────────┬───────────┘    └──────────┬───────────┘    └───────┬────────┘ │
│             │                           │                        │          │
│  ┌──────────▼───────────┐    ┌──────────▼───────────┐    ┌───────▼────────┐ │
│  │ suggestionAdapter.ts │    │ proposalAdapter.ts   │    │ patternAdapter │ │
│  │ (Data Conversion)    │    │ (Proposal Generator) │    │ (Tech Matcher) │ │
│  └──────────┬───────────┘    └──────────┬───────────┘    └───────┬────────┘ │
│             │                           │                        │          │
│  ┌──────────▼───────────┐    ┌──────────▼───────────┐    ┌───────▼────────┐ │
│  │ RefactorSuggestion   │    │     Proposals        │    │  Marketplace   │ │
│  │  (Unused Module)     │    │  (Unused Module)     │    │(Unused Module) │ │
│  └──────────────────────┘    └──────────────────────┘    └────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Integration Pattern

Each integration follows a consistent pattern:
1. **Adapter Layer**: Transform data between module formats
2. **Bridge Component**: Wrapper component that handles integration logic
3. **Graceful Degradation**: Error boundaries that hide failed components
4. **State Synchronization**: Minimal Zustand store bridges where needed

## Components and Interfaces

### Integration 1: RefactorSuggestion → RefactorWizard

#### New Components

**SuggestionIntegrationPanel** (`RefactorWizard/components/SuggestionIntegrationPanel.tsx`)
```typescript
interface SuggestionIntegrationPanelProps {
  projectPath: string;
  projectType?: string;
  onSuggestionsLoaded: (suggestions: RefactorOpportunity[]) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}
```

**Responsibilities:**
- Wraps RefactorSuggestionPanel from the unused module
- Converts RefactorSuggestion[] to RefactorOpportunity[] via adapter
- Emits converted suggestions to parent for merging with scan results
- Handles loading/error states independently

#### Adapter Functions

**suggestionAdapter.ts** (`RefactorWizard/lib/suggestionAdapter.ts`)
```typescript
// Convert RefactorSuggestion to RefactorOpportunity
function convertSuggestionToOpportunity(
  suggestion: RefactorSuggestion
): RefactorOpportunity;

// Merge suggestions with existing opportunities (deduplication)
function mergeSuggestionsWithOpportunities(
  suggestions: RefactorOpportunity[],
  opportunities: RefactorOpportunity[]
): RefactorOpportunity[];

// Extract clean architecture metadata for requirement generation
function extractCleanArchitectureMetadata(
  suggestion: RefactorSuggestion
): { principle: string; steps: string[] };
```

#### Integration Points

1. **ScanStep.tsx**: Add SuggestionIntegrationPanel below scan progress
2. **ReviewStep.tsx**: Display merged opportunities (scan + suggestions)
3. **requirementGenerator.ts**: Include clean architecture principles in output

### Integration 2: Proposals → Manager

#### New Components

**ImplementationProposalBridge** (`Manager/components/ImplementationProposalBridge.tsx`)
```typescript
interface ImplementationProposalBridgeProps {
  implementationLog: EnrichedImplementationLog;
  projectPath?: string;
  onProposalAccepted: (proposalId: string, requirementName: string) => void;
  onProposalDeclined: (proposalId: string) => void;
}
```

**Responsibilities:**
- Generates proposals from implementation log content
- Wraps ProposalPanel with implementation-specific context
- Handles accept/decline actions with requirement creation
- Manages proposal state lifecycle

#### Adapter Functions

**proposalAdapter.ts** (`Manager/lib/proposalAdapter.ts`)
```typescript
// Generate proposals from implementation log
function generateProposalsFromLog(
  log: EnrichedImplementationLog,
  contextDescription?: string
): Proposal[];

// Create requirement content from accepted proposal
function createRequirementFromProposal(
  proposal: Proposal,
  log: EnrichedImplementationLog
): string;

// Map proposal actions to Manager operations
function mapProposalAction(
  action: 'accept' | 'acceptWithCode' | 'decline',
  proposal: Proposal
): ManagerAction;
```

#### Integration Points

1. **ImplementationLogDetail.tsx**: Add ImplementationProposalBridge below overview
2. **ManagerLayout.tsx**: Handle proposal acceptance callbacks
3. **NewTaskModal.tsx**: Option to generate proposals for new tasks

### Integration 3: Marketplace → reflector

#### New Components

**ReflectorPatternRecommendations** (`reflector/components/ReflectorPatternRecommendations.tsx`)
```typescript
interface ReflectorPatternRecommendationsProps {
  selectedProjectIds: string[];
  onPatternClick: (patternId: string) => void;
}
```

**Responsibilities:**
- Wraps CommunityPatternRecommendations from Marketplace
- Determines tech stack from selected projects
- Filters patterns based on project language/framework
- Handles empty state by not rendering

#### Adapter Functions

**patternAdapter.ts** (`reflector/lib/patternAdapter.ts`)
```typescript
// Extract tech stack from project configuration
function extractProjectTechStack(
  projectId: string
): { language: string; framework: string };

// Filter patterns by tech stack compatibility
function filterPatternsByTechStack(
  patterns: DbRefactoringPatternWithAuthor[],
  techStack: { language: string; framework: string }
): DbRefactoringPatternWithAuthor[];

// Map pattern categories to reflector idea categories
function mapPatternCategoryToIdeaCategory(
  patternCategory: PatternCategory
): string;
```

#### Integration Points

1. **TotalViewDashboard.tsx**: Add ReflectorPatternRecommendations section
2. **ReflectorLayout.tsx**: Handle pattern click to open Marketplace modal
3. **TotalViewFilters.tsx**: Sync project filter with pattern recommendations

## Data Models

### Adapter Type Mappings

```typescript
// RefactorSuggestion → RefactorOpportunity mapping
interface SuggestionToOpportunityMapping {
  // Direct mappings
  id: string;                    // suggestion.id
  title: string;                 // suggestion.title
  description: string;           // suggestion.description
  severity: SeverityLevel;       // suggestion.severity
  files: string[];               // suggestion.files
  lineNumbers?: Record<string, number[]>; // suggestion.lineNumbers
  suggestedFix: string;          // suggestion.suggestedFix
  autoFixAvailable: boolean;     // suggestion.autoFixAvailable
  
  // Transformed mappings
  category: OpportunityCategory; // mapCategory(suggestion.category)
  effort: EffortLevel;           // suggestion.effort
  impact: string;                // `${suggestion.impact} - ${suggestion.cleanArchitecturePrinciple}`
  estimatedTime: string;         // estimateTime(suggestion.effort)
}

// EnrichedImplementationLog → Proposal mapping
interface LogToProposalMapping {
  id: string;                    // generated UUID
  title: string;                 // derived from log.title + improvement type
  rationale: string;             // generated from log.overview + log.overview_bullets
  timestamp: Date;               // new Date()
  status: 'pending';             // always starts pending
}

// Project → TechStack mapping
interface ProjectTechStackMapping {
  language: string;              // detected from package.json or file extensions
  framework: string;             // detected from dependencies or config files
}
```

### State Bridge Interfaces

```typescript
// Bridge store for RefactorWizard ↔ RefactorSuggestion
interface SuggestionBridgeState {
  suggestionResults: SuggestionEngineResult | null;
  isSuggestionPanelExpanded: boolean;
  selectedSuggestionIds: Set<string>;
  setSuggestionResults: (results: SuggestionEngineResult | null) => void;
  toggleSuggestionPanel: () => void;
  toggleSuggestionSelection: (id: string) => void;
}

// Bridge store for Manager ↔ Proposals
interface ProposalBridgeState {
  activeLogProposals: Map<string, Proposal[]>; // logId → proposals
  currentProposalIndex: Map<string, number>;   // logId → index
  setProposalsForLog: (logId: string, proposals: Proposal[]) => void;
  advanceProposal: (logId: string) => void;
  getActiveProposal: (logId: string) => Proposal | null;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Suggestion to Opportunity Conversion Preserves Data
*For any* RefactorSuggestion with valid fields, converting it to RefactorOpportunity should preserve the id, title, description, severity, and files fields exactly.
**Validates: Requirements 1.2**

### Property 2: Merged Opportunities Include All Selected Suggestions
*For any* set of selected suggestions and existing opportunities, the merged result should contain all selected suggestions and all existing opportunities without duplicates.
**Validates: Requirements 1.3**

### Property 3: Generated Requirements Include Clean Architecture Metadata
*For any* RefactorSuggestion with cleanArchitecturePrinciple and refactorSteps, the generated requirement content should contain both the principle text and all step texts.
**Validates: Requirements 1.4**

### Property 4: Summary Statistics Match Suggestion Counts
*For any* SuggestionEngineResult, the summary.totalIssues should equal suggestions.length, and the sum of byCategory values should equal totalIssues.
**Validates: Requirements 1.5**

### Property 5: Proposals Generated From Log Reference Log Content
*For any* EnrichedImplementationLog with non-empty overview, generated proposals should contain text derived from the overview or overview_bullets fields.
**Validates: Requirements 2.2**

### Property 6: Accepted Proposal Status Transitions Correctly
*For any* proposal in 'pending' status, accepting it should change its status to 'accepted' and not affect other proposals in the queue.
**Validates: Requirements 2.3**

### Property 7: Declined Proposal Advances Queue Index
*For any* proposal queue with currentIndex < length-1, declining the current proposal should increment currentIndex by 1.
**Validates: Requirements 2.5**

### Property 8: Carousel Progress Shows Correct Position
*For any* proposal queue of length N with currentIndex I, the progress indicator should display "(I+1) / N".
**Validates: Requirements 2.6**

### Property 9: Pattern Recommendations Match Project Tech Stack
*For any* project with a specific language and framework, all displayed pattern recommendations should have compatible language and framework metadata.
**Validates: Requirements 3.1, 3.4**

### Property 10: Pattern Display Contains Required Fields
*For any* displayed pattern, the rendered output should include the pattern's title, category, rating_average, download_count, and author_display_name.
**Validates: Requirements 3.2**

## Error Handling

### Graceful Degradation Strategy

Each integration point uses an error boundary pattern:

```typescript
// ErrorBoundary wrapper for integrated components
interface IntegrationErrorBoundaryProps {
  fallback?: React.ReactNode;  // Default: null (hide component)
  onError?: (error: Error) => void;
  children: React.ReactNode;
}
```

**Error Scenarios:**

1. **RefactorSuggestion API fails**: Hide suggestion panel, continue with standard scan results
2. **Proposal generation fails**: Show error toast, allow manual task creation
3. **Marketplace API fails**: Hide pattern recommendations section
4. **Adapter conversion fails**: Log error, skip invalid items, continue with valid ones

### Error Logging

All integration errors are logged with context:
```typescript
interface IntegrationError {
  integration: 'suggestion' | 'proposal' | 'marketplace';
  operation: string;
  error: Error;
  context: Record<string, unknown>;
  timestamp: Date;
}
```

## Testing Strategy

### Dual Testing Approach

This design uses both unit tests and property-based tests:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property-based tests**: Verify universal properties that should hold across all inputs

### Property-Based Testing Framework

**Library**: fast-check (TypeScript PBT library)
**Configuration**: Minimum 100 iterations per property test

### Test Organization

```
RefactorWizard/lib/__tests__/
├── suggestionAdapter.test.ts        # Unit tests for adapter
├── suggestionAdapter.property.ts    # Property tests for conversion

Manager/lib/__tests__/
├── proposalAdapter.test.ts          # Unit tests for adapter
├── proposalAdapter.property.ts      # Property tests for generation

reflector/lib/__tests__/
├── patternAdapter.test.ts           # Unit tests for adapter
├── patternAdapter.property.ts       # Property tests for filtering
```

### Property Test Annotations

Each property-based test must include a comment referencing the correctness property:
```typescript
// **Feature: unused-module-integration, Property 1: Suggestion to Opportunity Conversion Preserves Data**
```

### Test Generators

Custom generators for domain types:
```typescript
// Generator for RefactorSuggestion
const refactorSuggestionArb: fc.Arbitrary<RefactorSuggestion>;

// Generator for EnrichedImplementationLog
const implementationLogArb: fc.Arbitrary<EnrichedImplementationLog>;

// Generator for DbRefactoringPatternWithAuthor
const patternArb: fc.Arbitrary<DbRefactoringPatternWithAuthor>;
```
