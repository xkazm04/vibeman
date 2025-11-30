# Requirements Document

## Introduction

This specification defines the integration of three unused feature modules into their respective target modules within the Vibeman project. The goal is to increase the value of existing modules by incorporating complementary functionality from unused modules:

1. **RefactorSuggestion → RefactorWizard**: Integrate the AI-powered suggestion engine into the wizard workflow
2. **Proposals → Manager**: Add proposal-based task review to the implementation manager
3. **Marketplace → reflector**: Embed community pattern recommendations into the reflector dashboard

## Glossary

- **RefactorSuggestion**: An unused module providing AI-powered code analysis that detects anti-patterns, duplication, coupling issues, and clean code violations
- **RefactorWizard**: The main refactoring workflow system with a 7-step wizard for code analysis and requirement generation
- **Proposals**: An unused module providing a carousel-based UI for reviewing and accepting/declining proposals
- **Manager**: The implementation log management system for reviewing untested implementations
- **Marketplace**: An unused module providing a community pattern sharing and browsing system
- **reflector**: The implemented ideas dashboard showing achievements and statistics across projects
- **RefactorOpportunity**: A detected code issue with metadata (category, severity, effort, files, suggested fix)
- **RefactorSuggestion**: A suggestion from the suggestion engine with clean architecture principles and refactor steps
- **Proposal**: A pending item with title, rationale, and accept/decline actions
- **Pattern**: A community-shared refactoring pattern with ratings, downloads, and category metadata

## Requirements

### Requirement 1: RefactorSuggestion Integration into RefactorWizard

**User Story:** As a developer using RefactorWizard, I want to see AI-powered refactor suggestions alongside scan results, so that I can identify clean architecture violations and anti-patterns during my refactoring workflow.

#### Acceptance Criteria

1. WHEN a user completes the scan step in RefactorWizard THEN the RefactorWizard SHALL display a collapsible RefactorSuggestion panel showing detected anti-patterns, duplication, and coupling issues
2. WHEN the RefactorSuggestion engine detects issues THEN the RefactorWizard SHALL convert suggestions to RefactorOpportunity format and merge them with existing scan results
3. WHEN a user selects suggestions from the RefactorSuggestion panel THEN the RefactorWizard SHALL include those suggestions in the review step alongside other opportunities
4. WHEN generating requirement files THEN the RefactorWizard SHALL include clean architecture principles and refactor steps from selected suggestions
5. WHEN the suggestion engine scan completes THEN the RefactorWizard SHALL display summary statistics (total issues, by category, by severity) in the scan results

### Requirement 2: Proposals Integration into Manager

**User Story:** As a project manager reviewing implementations, I want to see AI-generated improvement proposals for each implementation log, so that I can quickly decide on next steps for untested implementations.

#### Acceptance Criteria

1. WHEN a user views an implementation log detail THEN the Manager SHALL display a ProposalPanel with contextual improvement proposals
2. WHEN proposals are generated for an implementation THEN the Manager SHALL create proposals based on the implementation's overview, bullets, and context
3. WHEN a user accepts a proposal THEN the Manager SHALL create a new requirement file with the proposal content and mark the proposal as accepted
4. WHEN a user accepts a proposal with code THEN the Manager SHALL trigger the Claude Code pipeline to implement the proposal
5. WHEN a user declines a proposal THEN the Manager SHALL move to the next proposal in the queue and record the decline action
6. WHEN multiple proposals exist THEN the Manager SHALL display them in a carousel format with progress indicators showing current position

### Requirement 3: Marketplace Integration into reflector

**User Story:** As a developer reviewing implemented ideas, I want to see relevant community refactoring patterns, so that I can discover proven solutions that match my project's technology stack.

#### Acceptance Criteria

1. WHEN a user views the reflector Total View dashboard THEN the reflector SHALL display a CommunityPatternRecommendations section with patterns matching the project's language and framework
2. WHEN patterns are displayed THEN the reflector SHALL show pattern title, category, rating, download count, and author information
3. WHEN a user clicks on a pattern recommendation THEN the reflector SHALL open the Marketplace modal with the pattern detail view
4. WHEN filtering ideas by project THEN the reflector SHALL update pattern recommendations to match the selected project's technology stack
5. WHEN no matching patterns exist THEN the reflector SHALL hide the recommendations section gracefully without showing empty state

### Requirement 4: Shared Integration Infrastructure

**User Story:** As a developer maintaining the codebase, I want the integrations to follow consistent patterns, so that the code remains maintainable and the modules stay loosely coupled.

#### Acceptance Criteria

1. WHEN integrating unused modules THEN the System SHALL import components and utilities through the module's index.ts barrel exports
2. WHEN data conversion is needed between modules THEN the System SHALL use adapter functions that transform data types without modifying original module code
3. WHEN an integrated component fails to load THEN the System SHALL gracefully degrade by hiding the component and logging the error
4. WHEN integrated components share state THEN the System SHALL use existing Zustand stores or create minimal bridge stores for cross-module communication
5. WHEN testing integrated features THEN the System SHALL include unit tests for adapter functions and integration tests for cross-module workflows
