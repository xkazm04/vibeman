# Implementation Plan

- [x] 1. Set up integration infrastructure and shared utilities




  - [x] 1.1 Create IntegrationErrorBoundary component for graceful degradation


    - Create `src/components/IntegrationErrorBoundary.tsx` with error catching and fallback rendering
    - Support optional onError callback for logging
    - Default fallback to null (hide component on error)
    - _Requirements: 4.3_

  - [x] 1.2 Write unit tests for IntegrationErrorBoundary

    - Test error catching behavior
    - Test fallback rendering
    - Test onError callback invocation
    - _Requirements: 4.5_

- [x] 2. Implement RefactorSuggestion → RefactorWizard integration






  - [x] 2.1 Create suggestionAdapter.ts with conversion functions

    - Implement `convertSuggestionToOpportunity()` function
    - Implement `mergeSuggestionsWithOpportunities()` with deduplication
    - Implement `extractCleanArchitectureMetadata()` for requirement generation
    - _Requirements: 1.2, 1.4_
  - [x] 2.2 Write property test for suggestion conversion


    - **Property 1: Suggestion to Opportunity Conversion Preserves Data**
    - **Validates: Requirements 1.2**
  - [x] 2.3 Write property test for merge operation

    - **Property 2: Merged Opportunities Include All Selected Suggestions**
    - **Validates: Requirements 1.3**
  - [x] 2.4 Create SuggestionIntegrationPanel component


    - Wrap RefactorSuggestionPanel from unused module
    - Handle suggestion loading and conversion via adapter
    - Emit converted suggestions to parent component
    - Support expand/collapse toggle
    - _Requirements: 1.1, 1.3_
  - [x] 2.5 Integrate SuggestionIntegrationPanel into ScanStep


    - Add collapsible panel below scan progress in ScanStep.tsx
    - Connect to refactorStore for state management
    - Merge suggestions with scan opportunities on load
    - _Requirements: 1.1, 1.5_

  - [x] 2.6 Write property test for summary statistics

    - **Property 4: Summary Statistics Match Suggestion Counts**
    - **Validates: Requirements 1.5**
  - [x] 2.7 Update requirementGenerator to include clean architecture metadata


    - Modify requirement generation to include cleanArchitecturePrinciple
    - Include refactorSteps in generated requirement content
    - _Requirements: 1.4_

  - [x] 2.8 Write property test for requirement generation

    - **Property 3: Generated Requirements Include Clean Architecture Metadata**
    - **Validates: Requirements 1.4**

- [x] 3. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
-

- [x] 4. Implement Proposals → Manager integration




  - [x] 4.1 Create proposalAdapter.ts with generation functions


    - Implement `generateProposalsFromLog()` function
    - Implement `createRequirementFromProposal()` function
    - Implement `mapProposalAction()` for action handling
    - _Requirements: 2.2, 2.3_

  - [x] 4.2 Write property test for proposal generation

    - **Property 5: Proposals Generated From Log Reference Log Content**
    - **Validates: Requirements 2.2**
  - [x] 4.3 Write property test for proposal acceptance

    - **Property 6: Accepted Proposal Status Transitions Correctly**
    - **Validates: Requirements 2.3**
  - [x] 4.4 Create ImplementationProposalBridge component


    - Wrap ProposalPanel from unused module
    - Generate proposals from implementation log content
    - Handle accept/decline actions with requirement creation
    - Support carousel navigation with progress indicator
    - _Requirements: 2.1, 2.6_

  - [x] 4.5 Write property test for decline action
    - **Property 7: Declined Proposal Advances Queue Index**
    - **Validates: Requirements 2.5**
  - [x] 4.6 Write property test for carousel progress

    - **Property 8: Carousel Progress Shows Correct Position**
    - **Validates: Requirements 2.6**

  - [x] 4.7 Integrate ImplementationProposalBridge into ImplementationLogDetail

    - Add proposal bridge below overview section in ImplementationLogDetail.tsx
    - Connect accept callback to requirement creation
    - Connect acceptWithCode callback to Claude Code pipeline
    - _Requirements: 2.1, 2.3, 2.4, 2.5_
-

- [x] 5. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Marketplace → reflector integration

  - [ ] 6.1 Export CommunityPatternRecommendations from Marketplace module
    - Add CommunityPatternRecommendations to Marketplace/index.ts barrel exports
    - _Requirements: 4.1_

  - [ ] 6.2 Create patternAdapter.ts with filtering functions
    - Implement `extractProjectTechStack()` function
    - Implement `filterPatternsByTechStack()` function
    - Implement `mapPatternCategoryToIdeaCategory()` function
    - _Requirements: 3.1, 3.4_

  - [ ]* 6.3 Write property test for tech stack filtering
    - **Property 9: Pattern Recommendations Match Project Tech Stack**
    - **Validates: Requirements 3.1, 3.4**

  - [ ] 6.4 Create ReflectorPatternRecommendations component
    - Wrap CommunityPatternRecommendations from Marketplace module
    - Extract tech stack from selected projects
    - Filter patterns based on project language/framework
    - Hide component when no matching patterns exist
    - _Requirements: 3.1, 3.5_

  - [ ]* 6.5 Write property test for pattern display
    - **Property 10: Pattern Display Contains Required Fields**
    - **Validates: Requirements 3.2**

  - [ ] 6.6 Integrate ReflectorPatternRecommendations into TotalViewDashboard
    - Add recommendations section in TotalViewDashboard.tsx
    - Connect to project filter state for tech stack updates
    - Handle pattern click to open Marketplace modal
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 6.7 Update ReflectorLayout to handle Marketplace modal
    - Import MarketplaceLayout from Marketplace module
    - Add state for controlling Marketplace modal visibility
    - Connect pattern click handler to open modal with selected pattern
    - _Requirements: 3.3_

- [ ] 7. Final Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.
