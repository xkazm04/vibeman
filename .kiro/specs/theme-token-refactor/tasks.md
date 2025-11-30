# Implementation Plan

- [x] 1. Set up refactoring infrastructure




  - [x] 1.1 Create color pattern scanner utility


    - Create `src/lib/refactor/colorScanner.ts` with regex patterns for cyan color classes
    - Implement file traversal to scan `.tsx` and `.ts` files
    - Return `ScanResult` with file path, line count, and color patterns
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Write property test for scanner completeness

    - **Property 1: Scanner completeness**
    - **Validates: Requirements 1.1, 1.2**
  - [x] 1.3 Create color token mapper


    - Create `src/lib/refactor/colorMapper.ts` with `COLOR_MAPPINGS` array
    - Map cyan-200/300/400 to textLight/text/textDark tokens
    - Map border-cyan patterns to border tokens
    - Map bg-cyan patterns to background tokens
    - Map shadow-cyan and gradient patterns to respective tokens
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 1.4 Write property test for color transformation


    - **Property 2: Color transformation correctness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 5.1**
-

- [x] 2. Implement manifest generation




  - [x] 2.1 Create manifest generator


    - Create `src/lib/refactor/manifestGenerator.ts`
    - Aggregate scan results into `RefactorManifest` structure
    - Include summary statistics by category and files over 200 lines
    - _Requirements: 1.3_
  - [x] 2.2 Write property test for manifest completeness


    - **Property 6: Manifest completeness**
    - **Validates: Requirements 1.3**
-

- [x] 3. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.
-

- [x] 4. Implement component transformer




  - [x] 4.1 Create theme hook injector


    - Create `src/lib/refactor/themeInjector.ts`
    - Detect if file already imports `useThemeStore`
    - Add import statement if missing
    - Add `const { getThemeColors } = useThemeStore()` in component body
    - _Requirements: 3.1, 3.2, 6.1_

  - [x] 4.2 Write property test for theme hook injection

    - **Property 3: Theme hook injection**
    - **Validates: Requirements 3.1, 3.2, 6.1, 6.2**
  - [x] 4.3 Create class replacement transformer


    - Create `src/lib/refactor/classTransformer.ts`
    - Replace hardcoded cyan classes with template literals using theme tokens
    - Handle className props, template strings, and string concatenation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.2_

- [x] 5. Implement component extractor




  - [x] 5.1 Create line count analyzer


    - Create `src/lib/refactor/lineAnalyzer.ts`
    - Count lines of code excluding comments and blank lines
    - Flag files exceeding 200 lines threshold
    - _Requirements: 4.1_
  - [x] 5.2 Write property test for line count threshold


    - **Property 4: Line count threshold detection**
    - **Validates: Requirements 4.1**
  - [x] 5.3 Create component extractor


    - Create `src/lib/refactor/componentExtractor.ts`
    - Identify extractable JSX blocks (render functions, large return statements)
    - Generate new component files with proper props interface
    - Update original file with import and component usage
    - _Requirements: 4.2, 4.3, 4.4_
  - [x] 5.4 Write property test for extraction interface preservation


    - **Property 5: Extraction preserves interface**
    - **Validates: Requirements 4.3, 4.4**

- [x] 6. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
-

- [ ] 7. Execute refactoring on codebase - Batch 1 (Core Components)





  - [x] 7.1 Scan and generate initial manifest

    - Run scanner on `src/components/` directory
    - Generate manifest file at `src/lib/refactor/manifest.json`
    - Review affected files list
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 7.2 Refactor UI components in src/components/ui


    - Transform color classes to theme tokens
    - Inject theme hooks where needed
    - Extract components from files >200 lines
    - _Requirements: 2.1-2.5, 3.1, 3.2, 4.1-4.4_

  - [x] 7.3 Refactor shared components in src/components

    - Transform GlowCard, Tooltip, UniversalModal, etc.
    - Apply theme tokens and extract large components
    - _Requirements: 2.1-2.5, 4.1-4.4_
-

- [x] 8. Execute refactoring on codebase - Batch 2 (Features)





  - [x] 8.1 Refactor Ideas feature components

    - Transform `src/app/features/Ideas/` components
    - Apply theme tokens to IdeasHeaderWithFilter, ContextRowSelection, etc.
    - Extract components from files >200 lines
    - _Requirements: 2.1-2.5, 4.1-4.4_

  - [x] 8.2 Refactor Tinder feature components

    - Transform `src/app/features/tinder/` components
    - Apply theme tokens to IdeaCard and related components
    - _Requirements: 2.1-2.5_

  - [x] 8.3 Refactor remaining feature directories

    - Transform components in other feature directories
    - Apply consistent theme token patterns
    - _Requirements: 2.1-2.5, 6.1, 6.2_

- [x] 9. Execute refactoring on codebase - Batch 3 (App Pages)






  - [x] 9.1 Refactor app page components

    - Transform `src/app/` page components and layouts
    - Apply theme tokens to navigation, sidebars, headers
    - _Requirements: 2.1-2.5_
  - [x] 9.2 Refactor project-specific components


    - Transform `src/app/projects/` components
    - Apply theme tokens to ProjectAI, ScanIdeas, etc.
    - _Requirements: 2.1-2.5_

- [x] 10. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Validation and cleanup






  - [x] 11.1 Run full test suite

    - Execute `npm test` to verify all existing tests pass
    - Fix any regressions introduced by refactoring
    - _Requirements: 5.3_

  - [x] 11.2 Visual verification with theme switching

    - Test midnight theme (should look identical to before)
    - Test phantom and shadow themes for proper color switching
    - _Requirements: 5.1, 5.2_
  - [x] 11.3 Update manifest with completion status


    - Mark all refactored files as complete in manifest
    - Document any files requiring manual review
    - _Requirements: 1.3_
- [x] 12. Final Checkpoint - Ensure all tests pass




- [ ] 12. Final Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.
