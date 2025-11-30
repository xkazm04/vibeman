# Implementation Plan

- [x] 1. Create shared wizard components and update main layout





  - [x] 1.1 Create WizardHeader component


    - Create `vibeman/src/app/features/RefactorWizard/components/WizardHeader.tsx`
    - Extract header section from RefactorWizardLayout (title, DSL toggle, Debt Prevention button, close button)
    - Implement WizardHeaderProps interface
    - _Requirements: 3.2_
  - [x] 1.2 Create WizardStepRouter component


    - Create `vibeman/src/app/features/RefactorWizard/components/WizardStepRouter.tsx`
    - Extract step routing logic with AnimatePresence from RefactorWizardLayout
    - Map step names to step components
    - _Requirements: 3.3_
  - [x] 1.3 Refactor RefactorWizardLayout to embedded layout


    - Remove fixed positioning, overlay backdrop, and z-50 classes
    - Replace with flex container that fills parent (w-full h-full)
    - Import and use WizardHeader and WizardStepRouter components
    - Remove AnimatePresence wrapper for modal open/close
    - Keep conditional rendering for isWizardOpen but without overlay
    - Target: under 150 lines
    - _Requirements: 1.1, 1.2, 3.1, 3.4_
  - [x] 1.4 Write property test for embedded layout structure


    - **Property 1: Embedded Layout Structure**
    - **Validates: Requirements 1.1**
-

- [x] 2. Checkpoint - Ensure layout refactoring works




  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Refactor PackageStep into sub-components
  - [ ] 3.1 Create PackageListItem component
    - Create `vibeman/src/app/features/RefactorWizard/sub_WizardSteps/components/sub_PackageStep/PackageListItem.tsx`
    - Extract individual package card rendering from PackageStep
    - Include selection state, metrics display, badges
    - _Requirements: 4.4_
  - [ ] 3.2 Create PackageGenerationView component
    - Create `vibeman/src/app/features/RefactorWizard/sub_WizardSteps/components/sub_PackageStep/PackageGenerationView.tsx`
    - Extract generation UI (ProviderSelector, context summary, generate button)
    - Handle loading state and empty opportunity warning
    - _Requirements: 4.2_
  - [ ] 3.3 Create PackageSelectionView component
    - Create `vibeman/src/app/features/RefactorWizard/sub_WizardSteps/components/sub_PackageStep/PackageSelectionView.tsx`
    - Extract selection UI (stats, filters, quick actions, package list)
    - Use PackageListItem for rendering packages
    - _Requirements: 4.3_
  - [ ] 3.4 Refactor PackageStep to use sub-components
    - Update PackageStep.tsx to import and use new sub-components
    - Conditionally render PackageGenerationView or PackageSelectionView
    - Target: under 100 lines
    - _Requirements: 4.1_






- [ ] 4. Refactor ScanStep into sub-components

  - [x] 4.1 Extract ScanVisualization component


    - Create `vibeman/src/app/features/RefactorWizard/sub_WizardSteps/components/sub_ScanStep/ScanVisualization.tsx`
    - Move existing ScanVisualization function to separate file


    - Include animated grid, scanning beam, progress display, particles
    - _Requirements: 5.2_


  - [ ] 4.2 Create ScanConfigView component
    - Create `vibeman/src/app/features/RefactorWizard/sub_WizardSteps/components/sub_ScanStep/ScanConfigView.tsx`



    - Extract pre-scan configuration UI (project info, folder selector, analysis features)


    - _Requirements: 5.3_
  - [x] 4.3 Create ScanProgressView component


    - Create `vibeman/src/app/features/RefactorWizard/sub_WizardSteps/components/sub_ScanStep/ScanProgressView.tsx`
    - Extract in-progress scan UI (visualization, progress bar, phase indicators)


    - _Requirements: 5.4_
  - [x] 4.4 Refactor ScanStep to use sub-components


    - Update ScanStep.tsx to import and use new sub-components


    - Conditionally render ScanConfigView or ScanProgressView based on isScanning
    - Target: under 100 lines





    - _Requirements: 5.1_



- [ ] 5. Refactor ReviewStep into sub-components



  - [ ] 5.1 Create ReviewStatsGrid component
    - Create `vibeman/src/app/features/RefactorWizard/sub_WizardSteps/components/sub_ReviewStep/ReviewStatsGrid.tsx`


    - Extract stats cards (Total Issues, Files Affected, High Priority, Selected)
    - _Requirements: 6.2_





  - [ ] 5.2 Create ReviewFilters component
    - Create `vibeman/src/app/features/RefactorWizard/sub_WizardSteps/components/sub_ReviewStep/ReviewFilters.tsx`
    - Extract filter dropdowns (category, severity) and quick select buttons


    - _Requirements: 6.3_
  - [x] 5.3 Create ReviewActionBar component


    - Create `vibeman/src/app/features/RefactorWizard/sub_WizardSteps/components/sub_ReviewStep/ReviewActionBar.tsx`
    - Extract bottom action bar (selection count, Quick Export, AI Packaging buttons)






    - _Requirements: 6.4_
  - [x] 5.4 Refactor ReviewStep to use sub-components


    - Update ReviewStep.tsx to import and use new sub-components
    - Target: under 100 lines


    - _Requirements: 6.1_



- [x] 6. Checkpoint - Ensure step refactoring works






  - Ensure all tests pass, ask the user if questions arise.



- [ ] 7. Refactor ResultsStep into sub-components

  - [x] 7.1 Create ResultsSummaryBanner component


    - Create `vibeman/src/app/features/RefactorWizard/sub_WizardSteps/components/sub_ResultsStep/ResultsSummaryBanner.tsx`



    - Extract success banner with checkmark and summary text



    - _Requirements: 7.2_


  - [ ] 7.2 Create ResultsStatsGrid component
    - Create `vibeman/src/app/features/RefactorWizard/sub_WizardSteps/components/sub_ResultsStep/ResultsStatsGrid.tsx`



    - Extract stats grid (Strategic Packages, Total Issues, Files Affected, Foundational)


    - _Requirements: 7.3_
  - [x] 7.3 Create ResultsNextSteps component

    - Create `vibeman/src/app/features/RefactorWizard/sub_WizardSteps/components/sub_ResultsStep/ResultsNextSteps.tsx`
    - Extract next steps guidance card with numbered instructions
    - _Requirements: 7.4_

  - [ ] 7.4 Refactor ResultsStep to use sub-components
    - Update ResultsStep.tsx to import and use new sub-components



    - Target: under 100 lines
    - _Requirements: 7.1_

- [ ] 8. Refactor ExecuteStep into sub-components

  - [ ] 8.1 Create ExecuteBreakdown component
    - Create `vibeman/src/app/features/RefactorWizard/components/sub_Execute/ExecuteBreakdown.tsx`
    - Extract package/batch breakdown list with creation status
    - Handle both direct mode (batches) and package mode
    - _Requirements: 8.2_
  - [ ] 8.2 Create ExecuteSuccessMessage component
    - Create `vibeman/src/app/features/RefactorWizard/components/sub_Execute/ExecuteSuccessMessage.tsx`
    - Extract success message with file list and next steps
    - _Requirements: 8.3_
  - [ ] 8.3 Refactor ExecuteStep to use sub-components
    - Update ExecuteStep.tsx to import and use new sub-components
    - Target: under 100 lines
    - _Requirements: 8.1_

- [ ] 9. Refactor DSLBuilderLayout into sub-components

  - [ ] 9.1 Create DSLBuilderHeader component
    - Create `vibeman/src/app/features/RefactorWizard/components/sub_DSLBuilder/DSLBuilderHeader.tsx`
    - Extract header with validation status, library toggle, execute button
    - _Requirements: 9.2_
  - [ ] 9.2 Create DSLBuilderTabs component
    - Create `vibeman/src/app/features/RefactorWizard/components/sub_DSLBuilder/DSLBuilderTabs.tsx`
    - Extract tab navigation (Templates, Scope, Rules, Execution, Preview)
    - _Requirements: 9.3_
  - [ ] 9.3 Create DSLRulesList component
    - Create `vibeman/src/app/features/RefactorWizard/components/sub_DSLBuilder/DSLRulesList.tsx`
    - Extract rules sidebar with add/delete/select functionality
    - _Requirements: 9.4_
  - [ ] 9.4 Refactor DSLBuilderLayout to use sub-components
    - Update DSLBuilderLayout.tsx to import and use new sub-components
    - Target: under 150 lines
    - _Requirements: 9.1_

- [ ] 10. Refactor SettingsStep into sub-components

  - [ ] 10.1 Create ScanGroupCard component
    - Create `vibeman/src/app/features/RefactorWizard/sub_WizardSteps/components/sub_SettingsStep/ScanGroupCard.tsx`
    - Extract individual scan group card with checkbox, icon, techniques preview
    - _Requirements: 10.2_
  - [ ] 10.2 Create ScanGroupList component
    - Create `vibeman/src/app/features/RefactorWizard/sub_WizardSteps/components/sub_SettingsStep/ScanGroupList.tsx`
    - Extract scan groups list with animations
    - Use ScanGroupCard for rendering each group
    - _Requirements: 10.3_
  - [ ] 10.3 Refactor SettingsStep to use sub-components
    - Update SettingsStep.tsx to import and use new sub-components
    - Target: under 100 lines
    - _Requirements: 10.1_

- [ ] 11. Checkpoint - Ensure all component refactoring works

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Write property tests for wizard behavior

  - [ ] 12.1 Write property test for progress indicator consistency
    - **Property 2: Progress Indicator Consistency**
    - **Validates: Requirements 2.3**
    - Test that WizardProgress highlights exactly one current step
    - Test that all preceding steps show completed status

- [ ] 13. Update documentation

  - [ ] 13.1 Update REFACTOR_WIZARD_OVERVIEW.md directory structure
    - Update the Directory Structure section to reflect new component organization
    - Add all new sub-component directories and files
    - _Requirements: 11.1_
  - [ ] 13.2 Update architecture overview in documentation
    - Replace modal pattern description with embedded layout pattern
    - Update component count in Technology Stack section
    - _Requirements: 11.2, 11.4_
  - [ ] 13.3 Document new sub-components
    - Add a new section listing all sub-components with their responsibilities
    - Include interface descriptions for key components
    - _Requirements: 11.3_

- [ ] 14. Final Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.
