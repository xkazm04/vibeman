# Implementation Plan

- [x] 1. Increase Implementation Log display limit






  - [x] 1.1 Update ImplementationLogList default limit from 10 to 40

    - Modify `vibeman/src/app/features/Goals/sub_ImplementationLog/ImplementationLogList.tsx`
    - Change default value in props interface from `limit = 10` to `limit = 40`
    - _Requirements: 1.1, 1.2_
-

- [x] 2. Remove advisor functionality from Context Overview




  - [x] 2.1 Remove advisor tab from ContextOverviewHeader


    - Modify `vibeman/src/app/features/Context/sub_ContextOverview/components/ContextOverviewHeader.tsx`
    - Remove 'advisors' from TabType union
    - Remove advisor tab button from render
    - _Requirements: 2.1, 2.2_
  - [x] 2.2 Remove advisor imports and tab content from ContextOverview


    - Modify `vibeman/src/app/features/Context/sub_ContextOverview/ContextOverview.tsx`
    - Remove AdvisorPanel import
    - Remove advisors tab case from AnimatePresence
    - Remove fileContents state and loadFileContents function (only used by advisor)
    - _Requirements: 2.1, 2.4_
  - [x] 2.3 Remove advisor imports and tab content from ContextOverviewInline


    - Modify `vibeman/src/app/features/Context/sub_ContextOverview/ContextOverviewInline.tsx`
    - Remove AdvisorPanel import
    - Remove advisors tab case from AnimatePresence
    - Remove fileContents state and loadFileContents function
    - _Requirements: 2.2, 2.4_

  - [x] 2.4 Delete advisor-related files

    - Delete `vibeman/src/app/features/Context/sub_ContextOverview/AdvisorPanel.tsx`
    - Delete `vibeman/src/app/features/Context/sub_ContextOverview/advisorPrompts.ts`
    - Delete `vibeman/src/app/features/Context/sub_ContextOverview/AdvisorResponseView.tsx`
    - Delete `vibeman/src/app/features/Context/sub_ContextOverview/types.ts`
    - _Requirements: 2.3_
-

- [x] 3. Checkpoint - Verify advisor removal




  - Ensure all tests pass, ask the user if questions arise.
-

- [x] 4. Add new code refactor prompt agent




  - [x] 4.1 Add code_refactor scan type to scanTypes.ts


    - Modify `vibeman/src/app/features/Ideas/lib/scanTypes.ts`
    - Add 'code_refactor' to ScanType union
    - Add configuration object to SCAN_TYPE_CONFIGS array
    - _Requirements: 3.1, 3.2_
  - [x] 4.2 Create code_refactor agent prompt file


    - Create agent prompt file following existing agent patterns
    - Focus on code cleanup, dead code removal, structural improvements
    - _Requirements: 3.3, 3.4_
-

- [x] 5. Enable deletion of General (no-context) ideas




  - [x] 5.1 Update BufferColumn to show delete button for General ideas


    - Modify `vibeman/src/app/features/Ideas/sub_Buffer/BufferColumn.tsx`
    - Remove `contextId &&` condition from delete button visibility
    - Update handleDeleteAll to handle null contextId case
    - _Requirements: 4.1, 4.2_

  - [x] 5.2 Update BufferView to handle General ideas deletion

    - Modify `vibeman/src/app/features/Ideas/sub_Buffer/BufferView.tsx`
    - Update handleContextDelete to handle null contextId
    - _Requirements: 4.3, 4.4_

  - [x] 5.3 Update ideaQueries to support deleting ideas with null context

    - Modify `vibeman/src/lib/queries/ideaQueries.ts` if needed
    - Ensure deleteContextIdeas mutation handles null contextId
    - _Requirements: 4.3_
  - [x] 5.4 Write property test for General ideas deletion


    - **Property 1: General Ideas Deletion Completeness**
    - **Validates: Requirements 4.3**

- [x] 6. Convert ContextRowSelection to multiselect with sorting





  - [x] 6.1 Update ContextRowSelection interface and state


    - Modify `vibeman/src/app/features/Ideas/components/ContextRowSelection.tsx`
    - Change selectedContextId to selectedContextIds array
    - Change onSelectContext to onSelectContexts
    - Implement toggle selection logic
    - _Requirements: 5.1, 5.2_

  - [x] 6.2 Add alphabetical sorting within context groups

    - Sort contexts by name ascending within each group
    - Apply sorting in groupedContexts useMemo
    - _Requirements: 5.3_

  - [x] 6.3 Update IdeasHeaderWithFilter to use multiselect

    - Modify `vibeman/src/app/features/Ideas/components/IdeasHeaderWithFilter.tsx`
    - Update props and state to handle array of context IDs
    - _Requirements: 5.1_
  - [x] 6.4 Update IdeasLayout to handle multiselect contexts


    - Modify `vibeman/src/app/features/Ideas/IdeasLayout.tsx`
    - Update filterContext state to array
    - Update handlers for multiselect
    - _Requirements: 5.1, 5.4_
  - [x] 6.5 Update ScanInitiator to process multiple selected contexts


    - Modify `vibeman/src/app/features/Ideas/sub_IdeasSetup/ScanInitiator.tsx`
    - Update to iterate over selected contexts for scanning
    - _Requirements: 5.4_
  - [x] 6.6 Write property test for context alphabetical sorting


    - **Property 2: Context Alphabetical Sorting**
    - **Validates: Requirements 5.3**
-

- [x] 7. Checkpoint - Verify multiselect functionality




  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Remove scan history feature






  - [x] 8.1 Remove history toggle and timeline from ScanInitiator

    - Modify `vibeman/src/app/features/Ideas/sub_IdeasSetup/ScanInitiator.tsx`
    - Remove History icon import
    - Remove showHistory state
    - Remove history toggle button
    - Remove ScanHistoryTimeline import and component
    - Remove ScanNarrator import and component
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 8.2 Delete scan history and narrator files

    - Delete `vibeman/src/app/features/Ideas/sub_IdeasSetup/components/ScanHistoryTimeline.tsx`
    - Delete `vibeman/src/app/features/Ideas/sub_IdeasSetup/components/ScanNarrator.tsx`
    - Delete `vibeman/src/app/features/Ideas/sub_IdeasSetup/lib/narratorMessages.ts`
    - _Requirements: 6.3_

- [x] 9. Add context name to tinder idea cards





  - [x] 9.1 Update TinderLayout to load and pass context names


    - Modify `vibeman/src/app/features/tinder/TinderLayout.tsx`
    - Import contextLoader utility
    - Load contexts for project
    - Pass contextName to IdeaCard
    - _Requirements: 7.1, 7.2_
  - [x] 9.2 Update IdeaCard to display context name


    - Modify `vibeman/src/app/features/tinder/components/IdeaCard.tsx`
    - Add contextName prop with default "General"
    - Display context name next to project name in footer
    - _Requirements: 7.1, 7.3, 7.4_
  - [x] 9.3 Write property test for General context fallback


    - **Property 3: General Context Fallback**
    - **Validates: Requirements 7.3**


- [x] 10. Final Checkpoint - Verify all changes




  - Ensure all tests pass, ask the user if questions arise.
