# Requirements Document

## Introduction

This specification covers a comprehensive cleanup and enhancement of several modules in the vibeman application. The changes include extending display limits, removing deprecated features (advisor functionality, scan history), adding new capabilities (refactor agent, multiselect contexts, delete General ideas), and enhancing the tinder card display with context information.

## Glossary

- **Implementation Log**: A component displaying recent implementation activities with a configurable item limit
- **Advisor**: A deprecated AI-powered analysis feature in the Context Overview that provides code insights
- **Buffer Ideas**: Ideas stored in a temporary buffer awaiting user review, grouped by context
- **General Ideas**: Ideas without an associated context, displayed under the "General" category
- **Context**: A logical grouping of files within a project for focused analysis
- **Scan Type/Agent**: A specialized AI prompt configuration for generating specific types of improvement ideas
- **Tinder Card**: A swipeable card interface for reviewing and accepting/rejecting ideas
- **Scan History**: A timeline feature showing past scan executions with token usage statistics
- **Scan Narrator**: A real-time narration panel providing updates during scan operations

## Requirements

### Requirement 1

**User Story:** As a user, I want to see more implementation log items, so that I can review a longer history of recent implementations.

#### Acceptance Criteria

1. WHEN the Implementation Log component renders, THE system SHALL display up to 40 items by default instead of 20
2. WHEN the limit parameter is not explicitly provided, THE system SHALL use 40 as the default value

### Requirement 2

**User Story:** As a developer, I want to remove the advisor functionality from the codebase, so that the application is cleaner and free of unused features.

#### Acceptance Criteria

1. WHEN the advisor tab is removed, THE ContextOverview component SHALL no longer render the advisors tab option
2. WHEN the advisor tab is removed, THE ContextOverviewInline component SHALL no longer render the advisors tab option
3. WHEN the advisor files are deleted, THE system SHALL remove AdvisorPanel.tsx, advisorPrompts.ts, AdvisorResponseView.tsx, and types.ts from sub_ContextOverview directory
4. WHEN the advisor imports are removed, THE ContextOverview and ContextOverviewInline components SHALL compile without errors

### Requirement 3

**User Story:** As a user, I want a new refactor/cleanup prompt agent, so that I can generate ideas specifically focused on code refactoring and cleaning.

#### Acceptance Criteria

1. WHEN the refactor agent is added, THE system SHALL include a new scan type called "code_refactor" in the SCAN_TYPE_CONFIGS
2. WHEN the refactor agent is configured, THE system SHALL assign it the category "technical" with appropriate emoji, label, and description
3. WHEN the refactor agent is selected, THE system SHALL generate ideas focused on code cleanup, dead code removal, and structural improvements
4. WHEN the refactor agent file is created, THE system SHALL follow the same philosophy and structure as existing agents (ambiguity, ui, architect)

### Requirement 4

**User Story:** As a user, I want to delete all ideas in the General category, so that I can clear buffer ideas that have no associated context.

#### Acceptance Criteria

1. WHEN viewing the General ideas column in BufferView, THE system SHALL display a delete button for the General category
2. WHEN the delete button is clicked for General ideas, THE system SHALL prompt for confirmation before deletion
3. WHEN deletion is confirmed, THE system SHALL remove all ideas where context_id is null for the current project
4. WHEN deletion completes, THE system SHALL refresh the ideas list to reflect the changes

### Requirement 5

**User Story:** As a user, I want to select multiple contexts for idea generation, so that I can scan several contexts in a single operation.

#### Acceptance Criteria

1. WHEN the ContextRowSelection component renders, THE system SHALL allow multiple context selections instead of single selection
2. WHEN multiple contexts are selected, THE system SHALL visually indicate all selected contexts
3. WHEN contexts are displayed in groups, THE system SHALL sort contexts alphabetically by name in ascending order within each group
4. WHEN multiple contexts are selected for scanning, THE ScanInitiator SHALL process ideas for all selected contexts

### Requirement 6

**User Story:** As a developer, I want to remove the scan history feature from the codebase, so that the application is cleaner and the UI is simplified.

#### Acceptance Criteria

1. WHEN the history feature is removed, THE ScanInitiator component SHALL no longer render the history toggle button
2. WHEN the history feature is removed, THE ScanInitiator component SHALL no longer render the ScanHistoryTimeline component
3. WHEN the history files are deleted, THE system SHALL remove ScanHistoryTimeline.tsx and ScanNarrator.tsx from sub_IdeasSetup/components directory
4. WHEN the history imports are removed, THE ScanInitiator component SHALL compile without errors

### Requirement 7

**User Story:** As a user, I want to see the context name on tinder idea cards, so that I can understand which part of the codebase the idea relates to.

#### Acceptance Criteria

1. WHEN an idea card is displayed in TinderLayout, THE system SHALL show the context name next to the project name
2. WHEN the idea has a context_id, THE system SHALL retrieve the context name using the contextLoader utility
3. WHEN the idea has no context_id, THE system SHALL display "General" as the context name
4. WHEN the context name is displayed, THE system SHALL format it consistently with the existing project name display
