/**
 * React Native Scan Strategy
 *
 * Uses composable PatternDetector pipeline for declarative detector registration.
 * Generic detectors are imported from techniques/common; only React Native-specific
 * detectors are defined here.
 */

import { RefactorScanStrategy, detector } from '../ScanStrategy';
import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import {
  checkLargeFile,
  checkDuplication,
  checkLongFunctions,
  checkConsoleStatements,
  checkAnyTypes,
  checkUnusedImports,
  checkComplexConditionals,
  checkMagicNumbers,
  checkReactHookDeps,
} from '../techniques/common';

// ========== React Native Specific Detectors ==========

function checkFlatListOptimization(file: FileAnalysis): RefactorOpportunity[] {
  const hasFlatList = file.content.includes('<FlatList');
  if (!hasFlatList) return [];

  const results: RefactorOpportunity[] = [];
  const hasGetItemLayout = file.content.includes('getItemLayout');
  const hasKeyExtractor = file.content.includes('keyExtractor');
  const hasMemorization = file.content.includes('React.memo') || file.content.includes('useMemo');

  if (!hasGetItemLayout) {
    results.push({
      id: `flatlist-getitemlayout-${file.path}`,
      title: `Add getItemLayout to FlatList in ${file.path}`,
      description: 'FlatList detected without getItemLayout. Adding it improves scrolling performance for fixed-size items.',
      category: 'performance',
      severity: 'low',
      impact: 'Improves FlatList scrolling performance',
      effort: 'low',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '30 minutes',
    });
  }

  if (!hasKeyExtractor) {
    results.push({
      id: `flatlist-keyextractor-${file.path}`,
      title: `Add keyExtractor to FlatList in ${file.path}`,
      description: 'FlatList detected without keyExtractor. Adding it prevents rendering issues and improves performance.',
      category: 'performance',
      severity: 'medium',
      impact: 'Prevents rendering bugs and improves list performance',
      effort: 'low',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '15 minutes',
    });
  }

  if (!hasMemorization) {
    results.push({
      id: `flatlist-memoization-${file.path}`,
      title: `Memoize FlatList renderItem in ${file.path}`,
      description: 'FlatList renderItem should be memoized with React.memo or useMemo to prevent unnecessary re-renders.',
      category: 'performance',
      severity: 'medium',
      impact: 'Reduces re-renders and improves list performance',
      effort: 'low',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '30 minutes',
    });
  }

  return results;
}

function checkRNImageOptimization(file: FileAnalysis): RefactorOpportunity[] {
  const results: RefactorOpportunity[] = [];
  const hasImage = file.content.includes('<Image');
  const hasResizeMode = file.content.includes('resizeMode');
  const hasLargeLocalImage = /require\(['"].*\.(jpg|jpeg|png)['"]\)/gi.test(file.content);

  if (hasImage && !hasResizeMode) {
    results.push({
      id: `image-resize-mode-${file.path}`,
      title: `Add resizeMode to Image in ${file.path}`,
      description: 'Image components should specify resizeMode to control how images are scaled.',
      category: 'performance',
      severity: 'low',
      impact: 'Improves image rendering and prevents layout issues',
      effort: 'low',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '15 minutes',
    });
  }

  if (hasLargeLocalImage) {
    results.push({
      id: `image-optimization-${file.path}`,
      title: `Optimize images in ${file.path}`,
      description: 'Large local images detected. Consider optimizing images or using react-native-fast-image for better performance.',
      category: 'performance',
      severity: 'low',
      impact: 'Reduces bundle size and improves app performance',
      effort: 'medium',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '1-2 hours',
    });
  }

  return results;
}

function checkMemoryLeaks(file: FileAnalysis): RefactorOpportunity[] {
  const hasUseEffect = file.content.includes('useEffect');
  const hasTimers = file.content.includes('setTimeout') || file.content.includes('setInterval');
  const hasListeners = file.content.includes('addEventListener') || file.content.includes('.on(');
  const hasCleanup = file.content.includes('return () =>');

  if (hasUseEffect && (hasTimers || hasListeners) && !hasCleanup) {
    return [{
      id: `memory-leak-${file.path}`,
      title: `Potential memory leak in ${file.path}`,
      description: 'useEffect with timers or listeners detected without cleanup. Add a cleanup function to prevent memory leaks.',
      category: 'maintainability',
      severity: 'high',
      impact: 'Prevents memory leaks and app crashes',
      effort: 'low',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '30 minutes',
    }];
  }

  return [];
}

function checkPlatformSpecific(file: FileAnalysis): RefactorOpportunity[] {
  const hasPlatformSelect = file.content.includes('Platform.select');
  const hasInlineConditions = /Platform\.OS\s*===\s*['"]ios['"]/.test(file.content) ||
                               /Platform\.OS\s*===\s*['"]android['"]/.test(file.content);
  const multipleInlineConditions = (file.content.match(/Platform\.OS\s*===/g) || []).length > 3;

  if (hasInlineConditions && multipleInlineConditions && !hasPlatformSelect) {
    return [{
      id: `platform-select-${file.path}`,
      title: `Use Platform.select in ${file.path}`,
      description: 'Multiple Platform.OS conditions detected. Consider using Platform.select for cleaner code.',
      category: 'maintainability',
      severity: 'low',
      impact: 'Improves code readability and maintainability',
      effort: 'low',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '30 minutes',
    }];
  }

  return [];
}

function checkAccessibility(file: FileAnalysis): RefactorOpportunity[] {
  const hasTouchables = file.content.includes('<TouchableOpacity') ||
                        file.content.includes('<TouchableHighlight') ||
                        file.content.includes('<Pressable');
  const hasAccessibilityLabel = file.content.includes('accessibilityLabel');
  const hasAccessibilityRole = file.content.includes('accessibilityRole');

  if (hasTouchables && (!hasAccessibilityLabel || !hasAccessibilityRole)) {
    return [{
      id: `accessibility-${file.path}`,
      title: `Add accessibility props in ${file.path}`,
      description: 'Touchable components detected without accessibility props. Add accessibilityLabel and accessibilityRole for better a11y.',
      category: 'maintainability',
      severity: 'low',
      impact: 'Improves app accessibility for users with disabilities',
      effort: 'low',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '30-60 minutes',
    }];
  }

  return [];
}

// ========== Strategy ==========

export class ReactNativeScanStrategy extends RefactorScanStrategy {
  readonly name = 'React Native Scanner';
  readonly techStack = 'react-native' as const;

  /** Declarative list of all detectors with their group assignments */
  private readonly detectors = [
    // Maintainability (shared)
    detector('maintainability', checkLargeFile),
    detector('maintainability', checkDuplication),
    detector('maintainability', checkLongFunctions),
    detector('maintainability', checkComplexConditionals),
    detector('maintainability', checkMagicNumbers),
    // Code Quality (shared)
    detector('code-quality', checkConsoleStatements),
    detector('code-quality', checkAnyTypes),
    detector('code-quality', checkUnusedImports),
    // React-specific (shared)
    detector('react-specific', checkReactHookDeps),
    // React Native specific checks
    detector('react-native-specific', checkFlatListOptimization),
    detector('react-native-specific', checkRNImageOptimization),
    detector('react-native-specific', checkMemoryLeaks),
    detector('react-native-specific', checkPlatformSpecific),
    detector('react-native-specific', checkAccessibility),
  ];

  getScanPatterns(): string[] {
    return [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
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

  async detectOpportunities(
    files: FileAnalysis[],
    selectedGroups?: string[],
    onProgress?: import('../ScanStrategy').ProgressCallback
  ): Promise<RefactorOpportunity[]> {
    return this.detectPatterns(files, this.detectors, selectedGroups, onProgress);
  }

  async canHandle(projectPath: string, projectType?: 'nextjs' | 'fastapi' | 'express' | 'react-native' | 'other'): Promise<boolean> {
    if (projectType === 'react-native') {
      return true;
    }

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
}
