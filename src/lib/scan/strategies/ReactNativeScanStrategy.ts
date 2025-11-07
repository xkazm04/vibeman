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
} from '@/app/features/RefactorWizard/lib/patternDetectors';

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
   * Detect React Native-specific opportunities
   */
  detectOpportunities(files: FileAnalysis[]): RefactorOpportunity[] {
    const opportunities: RefactorOpportunity[] = [];

    for (const file of files) {
      // Generic checks
      this.checkLargeFile(file, opportunities);
      this.checkDuplication(file, opportunities);
      this.checkLongFunctions(file, opportunities);
      this.checkConsoleStatements(file, opportunities);
      this.checkAnyTypes(file, opportunities);
      this.checkUnusedImports(file, opportunities);

      // React Native specific checks
      this.checkFlatListOptimization(file, opportunities);
      this.checkImageOptimization(file, opportunities);
      this.checkMemoryLeaks(file, opportunities);
      this.checkPlatformSpecific(file, opportunities);
      this.checkAccessibility(file, opportunities);
    }

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
    if (file.lines <= 500) return;

    opportunities.push(
      this.createOpportunity(
        `long-file-${file.path}`,
        `Large file detected: ${file.path}`,
        `This file has ${file.lines} lines. Consider splitting it into smaller components.`,
        'maintainability',
        file.lines > 1000 ? 'high' : 'medium',
        'Improves code organization and maintainability',
        'high',
        [file.path],
        false,
        '2-4 hours'
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

  // ========== Helpers ==========

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const { promises: fs } = await import('fs');
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
