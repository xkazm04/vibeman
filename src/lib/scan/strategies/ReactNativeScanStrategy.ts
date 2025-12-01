/**
 * React Native Scan Strategy
 *
 * Implements scanning logic specific to React Native applications.
 * Detects mobile-specific patterns and React Native conventions.
 */

import { BaseScanStrategy } from '../ScanStrategy';
import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import {
  detectDuplication,
  detectLongFunctions,
  detectConsoleStatements,
  detectAnyTypes,
  detectUnusedImports,
  detectComplexConditionals,
  detectMagicNumbers,
  detectReactHookDeps,
} from '@/lib/scan/patterns';

export class ReactNativeScanStrategy extends BaseScanStrategy {
  readonly name = 'React Native Scanner';
  readonly techStack = 'react-native' as const;

  getScanPatterns(): string[] {
    return [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      // React Native specific
      'src/**/*',
      'app/**/*',
      'components/**/*',
      'screens/**/*',
      'navigation/**/*',
    ];
  }

  getIgnorePatterns(): string[] {
    return [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/android/**',
      '**/ios/**',
      '**/.expo/**',
      '**/coverage/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/.git/**',
    ];
  }

  getRecommendedTechniqueGroups(): string[] {
    return [
      'code-quality',
      'maintainability',
      'performance',
      'react-native-specific',
    ];
  }

  /**
   * Detect React Native-specific opportunities (ASYNC)
   * FIXED: Now async with progress callbacks, event loop yielding, and group filtering
   */
  async detectOpportunities(
    files: FileAnalysis[],
    selectedGroups?: string[],
    onProgress?: import('../ScanStrategy').ProgressCallback
  ): Promise<RefactorOpportunity[]> {
    const opportunities: RefactorOpportunity[] = [];
    const opportunitiesRef = { count: 0 };

    // Process files in batches to avoid blocking the event loop
    await this.processFilesInBatches(
      files,
      async (file) => {
        // Code Quality & Maintainability
        if (this.shouldRunGroup('maintainability', selectedGroups)) {
          this.checkLargeFile(file, opportunities);
          this.checkDuplication(file, opportunities);
          this.checkLongFunctions(file, opportunities);
          this.checkComplexConditionals(file, opportunities);
          this.checkMagicNumbers(file, opportunities);
        }

        if (this.shouldRunGroup('code-quality', selectedGroups)) {
          this.checkConsoleStatements(file, opportunities);
          this.checkAnyTypes(file, opportunities);
          this.checkUnusedImports(file, opportunities);
        }

        // React-specific checks
        if (this.shouldRunGroup('react-specific', selectedGroups) || this.shouldRunGroup('react-native-specific', selectedGroups)) {
          this.checkReactHookDeps(file, opportunities);
        }

        // React Native specific checks
        if (this.shouldRunGroup('react-native-specific', selectedGroups)) {
          this.checkFlatListOptimization(file, opportunities);
          this.checkImageOptimization(file, opportunities);
          this.checkMemoryLeaks(file, opportunities);
          this.checkPlatformSpecific(file, opportunities);
          this.checkAccessibility(file, opportunities);
        }

        // Update opportunities count
        opportunitiesRef.count = opportunities.length;
      },
      10, // Process 10 files at a time
      onProgress,
      opportunitiesRef
    );

    return opportunities;
  }

  /**
   * Validate if this is a React Native project
   */
  async canHandle(projectPath: string, projectType?: 'nextjs' | 'fastapi' | 'express' | 'react-native' | 'other'): Promise<boolean> {
    if (projectType === 'react-native') {
      return true;
    }

    // Auto-detect by checking for React Native
    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');

      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await this.fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, 'utf-8')
        );
        const hasReactNative =
          packageJson.dependencies?.['react-native'] ||
          packageJson.devDependencies?.['react-native'];
        if (hasReactNative) return true;
      }

      // Check for app.json (Expo/React Native)
      const appJsonPath = path.join(projectPath, 'app.json');
      if (await this.fileExists(appJsonPath)) {
        const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf-8'));
        if (appJson.expo || appJson.name) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  // ========== Generic Checks ==========

  private checkLargeFile(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    // Stricter threshold: 200 lines (was 500)
    if (file.lines <= 200) return;

    // Escalate severity based on size
    let severity: RefactorOpportunity['severity'] = 'low';
    let effort: RefactorOpportunity['effort'] = 'medium';
    let estimatedTime = '1-2 hours';

    if (file.lines > 500) {
      severity = 'high';
      effort = 'high';
      estimatedTime = '3-5 hours';
    } else if (file.lines > 350) {
      severity = 'medium';
      effort = 'high';
      estimatedTime = '2-4 hours';
    } else if (file.lines > 200) {
      severity = 'low';
      effort = 'medium';
      estimatedTime = '1-2 hours';
    }

    opportunities.push(
      this.createOpportunity(
        `long-file-${file.path}`,
        `Large file detected: ${file.path}`,
        `This file has ${file.lines} lines. Consider splitting it into smaller components. Target: Keep files under 200 lines for better maintainability.`,
        'maintainability',
        severity,
        'Improves code organization, readability, and maintainability',
        effort,
        [file.path],
        false,
        estimatedTime
      )
    );
  }

  private checkDuplication(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const duplicatePatterns = detectDuplication(file.content);
    if (duplicatePatterns.length === 0) return;

    opportunities.push({
      id: `duplication-${file.path}`,
      title: `Code duplication in ${file.path}`,
      description: `Found ${duplicatePatterns.length} duplicated code blocks that could be extracted into reusable components.`,
      category: 'duplication',
      severity: 'medium',
      impact: 'Reduces code duplication and improves maintainability',
      effort: 'medium',
      files: [file.path],
      autoFixAvailable: true,
      estimatedTime: '1-2 hours',
    });
  }

  private checkLongFunctions(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const longFunctions = detectLongFunctions(file.content);
    if (longFunctions.length === 0) return;

    opportunities.push({
      id: `long-functions-${file.path}`,
      title: `Long functions in ${file.path}`,
      description: `Found ${longFunctions.length} functions exceeding 50 lines. Consider breaking them into smaller functions.`,
      category: 'maintainability',
      severity: 'low',
      impact: 'Improves code readability and testability',
      effort: 'medium',
      files: [file.path],
      lineNumbers: { [file.path]: longFunctions },
      autoFixAvailable: true,
      estimatedTime: '1-3 hours',
    });
  }

  private checkConsoleStatements(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const consoleStatements = detectConsoleStatements(file.content);
    if (consoleStatements.length === 0) return;

    opportunities.push({
      id: `console-logs-${file.path}`,
      title: `Console statements in ${file.path}`,
      description: `Found ${consoleStatements.length} console.log statements. Consider using a proper logging library or removing for production.`,
      category: 'code-quality',
      severity: 'low',
      impact: 'Cleaner production code and better debugging',
      effort: 'low',
      files: [file.path],
      lineNumbers: { [file.path]: consoleStatements },
      autoFixAvailable: true,
      estimatedTime: '15-30 minutes',
    });
  }

  private checkAnyTypes(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) return;

    const anyTypes = detectAnyTypes(file.content);
    if (anyTypes.length === 0) return;

    opportunities.push({
      id: `any-types-${file.path}`,
      title: `'any' type usage in ${file.path}`,
      description: `Found ${anyTypes.length} uses of 'any' type. Consider using proper TypeScript types for better type safety.`,
      category: 'code-quality',
      severity: 'medium',
      impact: 'Improves type safety and prevents runtime errors',
      effort: 'medium',
      files: [file.path],
      lineNumbers: { [file.path]: anyTypes },
      autoFixAvailable: false,
      estimatedTime: '30-60 minutes',
    });
  }

  private checkUnusedImports(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const unusedImports = detectUnusedImports(file.content);
    if (unusedImports.length === 0) return;

    opportunities.push({
      id: `unused-imports-${file.path}`,
      title: `Unused imports in ${file.path}`,
      description: `Found ${unusedImports.length} potentially unused imports that could be removed.`,
      category: 'code-quality',
      severity: 'low',
      impact: 'Cleaner code and smaller bundle size',
      effort: 'low',
      files: [file.path],
      autoFixAvailable: true,
      estimatedTime: '10-15 minutes',
    });
  }

  // ========== React Native Specific Checks ==========

  private checkFlatListOptimization(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const hasFlatList = file.content.includes('<FlatList');
    const hasGetItemLayout = file.content.includes('getItemLayout');
    const hasKeyExtractor = file.content.includes('keyExtractor');
    const hasMemorization = file.content.includes('React.memo') || file.content.includes('useMemo');

    if (hasFlatList) {
      if (!hasGetItemLayout) {
        opportunities.push(
          this.createOpportunity(
            `flatlist-getitemlayout-${file.path}`,
            `Add getItemLayout to FlatList in ${file.path}`,
            'FlatList detected without getItemLayout. Adding it improves scrolling performance for fixed-size items.',
            'performance',
            'low',
            'Improves FlatList scrolling performance',
            'low',
            [file.path],
            false,
            '30 minutes'
          )
        );
      }

      if (!hasKeyExtractor) {
        opportunities.push(
          this.createOpportunity(
            `flatlist-keyextractor-${file.path}`,
            `Add keyExtractor to FlatList in ${file.path}`,
            'FlatList detected without keyExtractor. Adding it prevents rendering issues and improves performance.',
            'performance',
            'medium',
            'Prevents rendering bugs and improves list performance',
            'low',
            [file.path],
            false,
            '15 minutes'
          )
        );
      }

      if (!hasMemorization) {
        opportunities.push(
          this.createOpportunity(
            `flatlist-memoization-${file.path}`,
            `Memoize FlatList renderItem in ${file.path}`,
            'FlatList renderItem should be memoized with React.memo or useMemo to prevent unnecessary re-renders.',
            'performance',
            'medium',
            'Reduces re-renders and improves list performance',
            'low',
            [file.path],
            false,
            '30 minutes'
          )
        );
      }
    }
  }

  private checkImageOptimization(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const hasImage = file.content.includes('<Image');
    const hasResizeMode = file.content.includes('resizeMode');
    const hasLargeLocalImage = /require\(['"].*\.(jpg|jpeg|png)['"]\)/gi.test(file.content);

    if (hasImage && !hasResizeMode) {
      opportunities.push(
        this.createOpportunity(
          `image-resize-mode-${file.path}`,
          `Add resizeMode to Image in ${file.path}`,
          'Image components should specify resizeMode to control how images are scaled.',
          'performance',
          'low',
          'Improves image rendering and prevents layout issues',
          'low',
          [file.path],
          false,
          '15 minutes'
        )
      );
    }

    if (hasLargeLocalImage) {
      opportunities.push(
        this.createOpportunity(
          `image-optimization-${file.path}`,
          `Optimize images in ${file.path}`,
          'Large local images detected. Consider optimizing images or using react-native-fast-image for better performance.',
          'performance',
          'low',
          'Reduces bundle size and improves app performance',
          'medium',
          [file.path],
          false,
          '1-2 hours'
        )
      );
    }
  }

  private checkMemoryLeaks(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const hasUseEffect = file.content.includes('useEffect');
    const hasTimers = file.content.includes('setTimeout') || file.content.includes('setInterval');
    const hasListeners = file.content.includes('addEventListener') || file.content.includes('.on(');
    const hasCleanup = file.content.includes('return () =>');

    if (hasUseEffect && (hasTimers || hasListeners) && !hasCleanup) {
      opportunities.push(
        this.createOpportunity(
          `memory-leak-${file.path}`,
          `Potential memory leak in ${file.path}`,
          'useEffect with timers or listeners detected without cleanup. Add a cleanup function to prevent memory leaks.',
          'maintainability',
          'high',
          'Prevents memory leaks and app crashes',
          'low',
          [file.path],
          false,
          '30 minutes'
        )
      );
    }
  }

  private checkPlatformSpecific(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const hasPlatformSelect = file.content.includes('Platform.select');
    const hasInlineConditions = /Platform\.OS\s*===\s*['"]ios['"]/.test(file.content) ||
                                 /Platform\.OS\s*===\s*['"]android['"]/.test(file.content);
    const multipleInlineConditions = (file.content.match(/Platform\.OS\s*===/g) || []).length > 3;

    if (hasInlineConditions && multipleInlineConditions && !hasPlatformSelect) {
      opportunities.push(
        this.createOpportunity(
          `platform-select-${file.path}`,
          `Use Platform.select in ${file.path}`,
          'Multiple Platform.OS conditions detected. Consider using Platform.select for cleaner code.',
          'maintainability',
          'low',
          'Improves code readability and maintainability',
          'low',
          [file.path],
          false,
          '30 minutes'
        )
      );
    }
  }

  private checkAccessibility(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const hasTouchables = file.content.includes('<TouchableOpacity') ||
                          file.content.includes('<TouchableHighlight') ||
                          file.content.includes('<Pressable');
    const hasAccessibilityLabel = file.content.includes('accessibilityLabel');
    const hasAccessibilityRole = file.content.includes('accessibilityRole');

    if (hasTouchables && (!hasAccessibilityLabel || !hasAccessibilityRole)) {
      opportunities.push(
        this.createOpportunity(
          `accessibility-${file.path}`,
          `Add accessibility props in ${file.path}`,
          'Touchable components detected without accessibility props. Add accessibilityLabel and accessibilityRole for better a11y.',
          'maintainability',
          'low',
          'Improves app accessibility for users with disabilities',
          'low',
          [file.path],
          false,
          '30-60 minutes'
        )
      );
    }
  }

  private checkComplexConditionals(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const issues = detectComplexConditionals(file.content);
    if (issues.length === 0) return;

    const deepNesting = issues.filter(i => i.type === 'deep-nesting');
    const complexBoolean = issues.filter(i => i.type === 'complex-boolean');

    if (deepNesting.length > 0) {
      const lines = deepNesting.map(i => i.line);
      opportunities.push({
        id: `complex-nesting-${file.path}`,
        title: `Deep conditional nesting in ${file.path}`,
        description: `Found ${deepNesting.length} deeply nested conditional blocks (>3 levels). Consider using early returns or extracting to functions.`,
        category: 'maintainability',
        severity: deepNesting.some(i => i.severity === 'high') ? 'high' : 'medium',
        impact: 'Improves code readability',
        effort: 'medium',
        files: [file.path],
        lineNumbers: { [file.path]: lines },
        autoFixAvailable: false,
        estimatedTime: '1-2 hours',
      });
    }

    if (complexBoolean.length > 0) {
      const lines = complexBoolean.map(i => i.line);
      opportunities.push({
        id: `complex-boolean-${file.path}`,
        title: `Complex boolean expressions in ${file.path}`,
        description: `Found ${complexBoolean.length} complex conditions. Consider extracting to named boolean variables.`,
        category: 'maintainability',
        severity: 'medium',
        impact: 'Improves code readability',
        effort: 'low',
        files: [file.path],
        lineNumbers: { [file.path]: lines },
        autoFixAvailable: true,
        estimatedTime: '30-60 minutes',
      });
    }
  }

  private checkMagicNumbers(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const magicNumbers = detectMagicNumbers(file.content);
    if (magicNumbers.length === 0) return;

    const highSeverity = magicNumbers.filter(m => m.severity === 'high');
    const mediumSeverity = magicNumbers.filter(m => m.severity === 'medium');
    const total = magicNumbers.length;

    if (total > 0) {
      const lines = magicNumbers.map(m => m.line);
      const suggestedNames = magicNumbers
        .filter(m => m.suggestedName)
        .map(m => m.suggestedName)
        .slice(0, 3);

      const severity = highSeverity.length > 0 ? 'high' : mediumSeverity.length > 0 ? 'medium' : 'low';

      opportunities.push({
        id: `magic-numbers-${file.path}`,
        title: `Magic numbers in ${file.path}`,
        description: `Found ${total} magic numbers that should be extracted to named constants.${
          suggestedNames.length > 0 ? ` Suggested: ${suggestedNames.join(', ')}` : ''
        }`,
        category: 'maintainability',
        severity,
        impact: 'Improves maintainability',
        effort: total > 10 ? 'medium' : 'low',
        files: [file.path],
        lineNumbers: { [file.path]: lines },
        autoFixAvailable: true,
        estimatedTime: total > 10 ? '1-2 hours' : '30-60 minutes',
      });
    }
  }

  private checkReactHookDeps(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    if (!file.path.endsWith('.tsx') && !file.path.endsWith('.jsx')) {
      return;
    }

    const issues = detectReactHookDeps(file.content);
    if (issues.length === 0) return;

    const missingDeps = issues.filter(i => i.issueType === 'missing-dependency');
    const unnecessaryDeps = issues.filter(i => i.issueType === 'unnecessary-dependency');
    const missingArray = issues.filter(i => i.issueType === 'missing-array');

    if (missingDeps.length > 0) {
      const lines = missingDeps.map(i => i.line);
      opportunities.push({
        id: `missing-hook-deps-${file.path}`,
        title: `Missing React Hook dependencies in ${file.path}`,
        description: `Found ${missingDeps.length} hooks with missing dependencies that can cause bugs.`,
        category: 'code-quality',
        severity: 'high',
        impact: 'Prevents bugs from stale closures',
        effort: 'low',
        files: [file.path],
        lineNumbers: { [file.path]: lines },
        autoFixAvailable: true,
        estimatedTime: '15-30 minutes',
      });
    }

    if (missingArray.length > 0) {
      const lines = missingArray.map(i => i.line);
      opportunities.push({
        id: `missing-deps-array-${file.path}`,
        title: `Missing dependency arrays in ${file.path}`,
        description: `Found ${missingArray.length} hooks without dependency arrays.`,
        category: 'code-quality',
        severity: 'high',
        impact: 'Prevents infinite loops',
        effort: 'low',
        files: [file.path],
        lineNumbers: { [file.path]: lines },
        autoFixAvailable: true,
        estimatedTime: '15-30 minutes',
      });
    }

    if (unnecessaryDeps.length > 0) {
      const lines = unnecessaryDeps.map(i => i.line);
      opportunities.push({
        id: `unnecessary-hook-deps-${file.path}`,
        title: `Unnecessary React Hook dependencies in ${file.path}`,
        description: `Found ${unnecessaryDeps.length} hooks with unnecessary dependencies causing re-renders.`,
        category: 'performance',
        severity: 'low',
        impact: 'Reduces unnecessary re-renders',
        effort: 'low',
        files: [file.path],
        lineNumbers: { [file.path]: lines },
        autoFixAvailable: true,
        estimatedTime: '10-15 minutes',
      });
    }
  }

}
