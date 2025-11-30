# Requirements Document

## Introduction

This specification covers the redesign of the RefactorWizard module, a multi-step codebase static analysis tool. The current implementation uses a modal window pattern that limits screen real estate and creates suboptimal UX. This redesign will:

1. Transform the wizard from a modal-based layout to a full-page embedded layout within its parent container
2. Refactor large component files (200+ lines) into smaller, modular components for better maintainability
3. Update the documentation to reflect the new architecture and component structure

## Glossary

- **RefactorWizard**: The multi-step wizard component for codebase static analysis and refactoring planning
- **WizardStep**: An individual step in the wizard workflow (Settings, Scan, Plan, Review, Package, Execute, Results)
- **DSLBuilder**: A visual builder for creating refactoring DSL specifications
- **CyberCard**: A styled card component used throughout the wizard UI
- **StepContainer**: A wrapper component providing consistent layout for wizard steps
- **Modal Layout**: Current implementation using fixed overlay with backdrop blur
- **Embedded Layout**: Target implementation rendering within parent container without overlay

## Requirements

### Requirement 1

**User Story:** As a user, I want the RefactorWizard to utilize the full available page space, so that I can see more content and have a better analysis experience.

#### Acceptance Criteria

1. WHEN the RefactorWizard is opened THEN the Wizard_Layout SHALL render within its parent container without fixed positioning or overlay backdrop
2. WHEN the RefactorWizard is displayed THEN the Wizard_Layout SHALL expand to fill the available width and height of its parent container
3. WHEN the RefactorWizard is closed THEN the Wizard_Layout SHALL unmount cleanly without affecting sibling components
4. WHEN the viewport is resized THEN the Wizard_Layout SHALL responsively adjust its dimensions to match the parent container

### Requirement 2

**User Story:** As a user, I want smooth navigation between wizard steps, so that I can progress through the analysis workflow without jarring transitions.

#### Acceptance Criteria

1. WHEN a user navigates between wizard steps THEN the Wizard_Layout SHALL animate the transition using consistent enter/exit animations
2. WHEN a step transition occurs THEN the Wizard_Layout SHALL preserve scroll position within the step content area
3. WHEN the sidebar progress indicator is visible THEN the Wizard_Layout SHALL highlight the current step and show completion status for previous steps

### Requirement 3

**User Story:** As a developer, I want the RefactorWizardLayout component to be under 150 lines of code, so that it is easier to understand and maintain.

#### Acceptance Criteria

1. WHEN the RefactorWizardLayout.tsx file is analyzed THEN the File_Structure SHALL contain fewer than 150 lines of code
2. WHEN the RefactorWizardLayout component is reviewed THEN the Component_Structure SHALL delegate header rendering to a separate WizardHeader component
3. WHEN the RefactorWizardLayout component is reviewed THEN the Component_Structure SHALL delegate step routing to a separate WizardStepRouter component
4. WHEN the RefactorWizardLayout component is reviewed THEN the Component_Structure SHALL delegate DSL mode handling to the existing DSLBuilderLayout component

### Requirement 4

**User Story:** As a developer, I want the PackageStep component to be modularized into smaller files, so that each concern is isolated and testable.

#### Acceptance Criteria

1. WHEN the PackageStep module is analyzed THEN the File_Structure SHALL have a main PackageStep.tsx file under 100 lines
2. WHEN the PackageStep module is analyzed THEN the File_Structure SHALL contain a separate PackageGenerationView component for the generation UI
3. WHEN the PackageStep module is analyzed THEN the File_Structure SHALL contain a separate PackageSelectionView component for the selection UI
4. WHEN the PackageStep module is analyzed THEN the File_Structure SHALL contain a separate PackageListItem component for individual package rendering

### Requirement 5

**User Story:** As a developer, I want the ScanStep component to be modularized into smaller files, so that the scanning visualization and configuration are separated.

#### Acceptance Criteria

1. WHEN the ScanStep module is analyzed THEN the File_Structure SHALL have a main ScanStep.tsx file under 100 lines
2. WHEN the ScanStep module is analyzed THEN the File_Structure SHALL contain a separate ScanVisualization component for the animated scan display
3. WHEN the ScanStep module is analyzed THEN the File_Structure SHALL contain a separate ScanConfigView component for pre-scan configuration
4. WHEN the ScanStep module is analyzed THEN the File_Structure SHALL contain a separate ScanProgressView component for in-progress scan display

### Requirement 6

**User Story:** As a developer, I want the ReviewStep component to be modularized into smaller files, so that filtering, statistics, and opportunity display are separated.

#### Acceptance Criteria

1. WHEN the ReviewStep module is analyzed THEN the File_Structure SHALL have a main ReviewStep.tsx file under 100 lines
2. WHEN the ReviewStep module is analyzed THEN the File_Structure SHALL contain a separate ReviewStatsGrid component for statistics display
3. WHEN the ReviewStep module is analyzed THEN the File_Structure SHALL contain a separate ReviewFilters component for category and severity filtering
4. WHEN the ReviewStep module is analyzed THEN the File_Structure SHALL contain a separate ReviewActionBar component for selection actions and navigation

### Requirement 7

**User Story:** As a developer, I want the ResultsStep component to be modularized into smaller files, so that summary statistics and next steps guidance are separated.

#### Acceptance Criteria

1. WHEN the ResultsStep module is analyzed THEN the File_Structure SHALL have a main ResultsStep.tsx file under 100 lines
2. WHEN the ResultsStep module is analyzed THEN the File_Structure SHALL contain a separate ResultsSummaryBanner component for the success banner
3. WHEN the ResultsStep module is analyzed THEN the File_Structure SHALL contain a separate ResultsStatsGrid component for statistics display
4. WHEN the ResultsStep module is analyzed THEN the File_Structure SHALL contain a separate ResultsNextSteps component for execution guidance

### Requirement 8

**User Story:** As a developer, I want the ExecuteStep component to be modularized into smaller files, so that progress tracking and file creation are separated.

#### Acceptance Criteria

1. WHEN the ExecuteStep module is analyzed THEN the File_Structure SHALL have a main ExecuteStep.tsx file under 100 lines
2. WHEN the ExecuteStep module is analyzed THEN the File_Structure SHALL contain a separate ExecuteBreakdown component for package/batch breakdown display
3. WHEN the ExecuteStep module is analyzed THEN the File_Structure SHALL contain a separate ExecuteSuccessMessage component for completion state

### Requirement 9

**User Story:** As a developer, I want the DSLBuilderLayout component to be modularized into smaller files, so that tab management and spec editing are separated.

#### Acceptance Criteria

1. WHEN the DSLBuilderLayout module is analyzed THEN the File_Structure SHALL have a main DSLBuilderLayout.tsx file under 150 lines
2. WHEN the DSLBuilderLayout module is analyzed THEN the File_Structure SHALL contain a separate DSLBuilderHeader component for header and validation status
3. WHEN the DSLBuilderLayout module is analyzed THEN the File_Structure SHALL contain a separate DSLBuilderTabs component for tab navigation
4. WHEN the DSLBuilderLayout module is analyzed THEN the File_Structure SHALL contain a separate DSLRulesList component for the rules sidebar

### Requirement 10

**User Story:** As a developer, I want the SettingsStep component to be modularized into smaller files, so that provider selection and scan group selection are separated.

#### Acceptance Criteria

1. WHEN the SettingsStep module is analyzed THEN the File_Structure SHALL have a main SettingsStep.tsx file under 100 lines
2. WHEN the SettingsStep module is analyzed THEN the File_Structure SHALL contain a separate ScanGroupCard component for individual scan group rendering
3. WHEN the SettingsStep module is analyzed THEN the File_Structure SHALL contain a separate ScanGroupList component for the list of scan groups

### Requirement 11

**User Story:** As a developer, I want the REFACTOR_WIZARD_OVERVIEW.md documentation to accurately reflect the new architecture, so that future developers can understand the codebase.

#### Acceptance Criteria

1. WHEN the documentation is reviewed THEN the Documentation SHALL include an updated directory structure reflecting the new component organization
2. WHEN the documentation is reviewed THEN the Documentation SHALL describe the embedded layout pattern replacing the modal pattern
3. WHEN the documentation is reviewed THEN the Documentation SHALL list all new sub-components with their responsibilities
4. WHEN the documentation is reviewed THEN the Documentation SHALL update the component count and architecture overview section
