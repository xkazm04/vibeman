/**
 * Component Registry
 * Provides metadata for all available blueprint components
 */

import { ComponentMeta, PromptMeta, AnalyzerCategory } from '../types';

// ============================================================================
// Technical Analyzers
// ============================================================================

export const TECHNICAL_ANALYZERS: ComponentMeta[] = [
  {
    id: 'console-analyzer',
    componentId: 'analyzer.console',
    type: 'analyzer',
    category: 'technical',
    name: 'Console Statements',
    description: 'Detect console.log, console.warn, console.error statements that should be removed before production',
    icon: 'Terminal',
    color: '#f59e0b',
    tags: ['cleanup', 'debug', 'console'],
    compatibleProcessors: ['filter', 'group', 'priority', 'batch', 'merge'],
  },
  {
    id: 'any-types-analyzer',
    componentId: 'analyzer.any-types',
    type: 'analyzer',
    category: 'technical',
    name: 'Any Type Usage',
    description: 'Detect usage of TypeScript "any" type that reduces type safety',
    icon: 'Code2',
    color: '#ef4444',
    tags: ['typescript', 'types', 'safety'],
    compatibleProcessors: ['filter', 'group', 'priority', 'batch', 'merge'],
  },
  {
    id: 'unused-imports-analyzer',
    componentId: 'analyzer.unused-imports',
    type: 'analyzer',
    category: 'technical',
    name: 'Unused Imports',
    description: 'Detect import statements that are never used in the code',
    icon: 'PackageX',
    color: '#8b5cf6',
    tags: ['cleanup', 'imports', 'bundle'],
    compatibleProcessors: ['filter', 'group', 'priority', 'batch', 'merge'],
  },
  {
    id: 'large-files-analyzer',
    componentId: 'analyzer.large-files',
    type: 'analyzer',
    category: 'technical',
    name: 'Large Files',
    description: 'Detect files that exceed recommended line count thresholds',
    icon: 'FileWarning',
    color: '#ec4899',
    tags: ['refactor', 'size', 'maintainability'],
    compatibleProcessors: ['filter', 'group', 'priority', 'batch'],
  },
  {
    id: 'long-functions-analyzer',
    componentId: 'analyzer.long-functions',
    type: 'analyzer',
    category: 'technical',
    name: 'Long Functions',
    description: 'Detect functions that exceed recommended line count',
    icon: 'Braces',
    color: '#06b6d4',
    tags: ['refactor', 'complexity', 'maintainability'],
    compatibleProcessors: ['filter', 'group', 'priority', 'batch'],
  },
  {
    id: 'complexity-analyzer',
    componentId: 'analyzer.complexity',
    type: 'analyzer',
    category: 'technical',
    name: 'Cyclomatic Complexity',
    description: 'Detect functions with high cyclomatic complexity scores',
    icon: 'GitBranch',
    color: '#f43f5e',
    tags: ['complexity', 'quality', 'testability'],
    compatibleProcessors: ['filter', 'group', 'priority', 'batch'],
  },
  {
    id: 'duplication-analyzer',
    componentId: 'analyzer.duplication',
    type: 'analyzer',
    category: 'technical',
    name: 'Code Duplication',
    description: 'Detect duplicated code blocks within and across files',
    icon: 'Copy',
    color: '#10b981',
    tags: ['duplication', 'dry', 'refactor'],
    compatibleProcessors: ['filter', 'group', 'priority', 'batch'],
  },
  {
    id: 'magic-numbers-analyzer',
    componentId: 'analyzer.magic-numbers',
    type: 'analyzer',
    category: 'technical',
    name: 'Magic Numbers',
    description: 'Detect hardcoded numeric literals that should be named constants',
    icon: 'Hash',
    color: '#6366f1',
    tags: ['constants', 'readability', 'maintainability'],
    compatibleProcessors: ['filter', 'group', 'priority', 'batch'],
  },
  {
    id: 'react-hooks-analyzer',
    componentId: 'analyzer.react-hooks',
    type: 'analyzer',
    category: 'technical',
    name: 'React Hooks',
    description: 'Detect issues with React Hook dependencies (useEffect, useCallback, useMemo)',
    icon: 'Repeat',
    color: '#14b8a6',
    tags: ['react', 'hooks', 'performance'],
    compatibleProcessors: ['filter', 'group', 'priority', 'batch'],
  },
];

// ============================================================================
// Business Analyzer Prompts
// ============================================================================

export const BUSINESS_PROMPTS: PromptMeta[] = [
  // Feature & Architecture
  {
    id: 'zen_architect',
    name: 'Zen Architect',
    description: 'Clean architecture improvements and structural optimization',
    icon: 'Layers',
    category: 'architecture',
  },
  {
    id: 'feature_scout',
    name: 'Feature Scout',
    description: 'Discover new feature opportunities based on codebase patterns',
    icon: 'Compass',
    category: 'feature',
  },
  {
    id: 'business_visionary',
    name: 'Business Visionary',
    description: 'Identify business value opportunities in the codebase',
    icon: 'Briefcase',
    category: 'innovation',
  },
  // Quality & Security
  {
    id: 'bug_hunter',
    name: 'Bug Hunter',
    description: 'Detect potential bugs and edge cases',
    icon: 'Bug',
    category: 'quality',
  },
  {
    id: 'perf_optimizer',
    name: 'Performance Optimizer',
    description: 'Find performance bottlenecks and optimization opportunities',
    icon: 'Gauge',
    category: 'quality',
  },
  {
    id: 'security_protector',
    name: 'Security Protector',
    description: 'Identify security vulnerabilities and protection gaps',
    icon: 'Shield',
    category: 'quality',
  },
  // User Experience
  {
    id: 'user_empathy_champion',
    name: 'User Empathy Champion',
    description: 'Improve user experience through code analysis',
    icon: 'Heart',
    category: 'user',
  },
  {
    id: 'ui_perfectionist',
    name: 'UI Perfectionist',
    description: 'Polish UI components and interactions',
    icon: 'Palette',
    category: 'user',
  },
  {
    id: 'accessibility_advocate',
    name: 'Accessibility Advocate',
    description: 'Ensure accessibility compliance and improvements',
    icon: 'Eye',
    category: 'user',
  },
  {
    id: 'onboarding_optimizer',
    name: 'Onboarding Optimizer',
    description: 'Improve user onboarding flows',
    icon: 'Rocket',
    category: 'user',
  },
  {
    id: 'delight_designer',
    name: 'Delight Designer',
    description: 'Add delightful micro-interactions and polish',
    icon: 'Sparkles',
    category: 'user',
  },
  // Innovation
  {
    id: 'paradigm_shifter',
    name: 'Paradigm Shifter',
    description: 'Revolutionary improvements and new approaches',
    icon: 'Zap',
    category: 'innovation',
  },
  {
    id: 'moonshot_architect',
    name: 'Moonshot Architect',
    description: 'Ambitious long-term improvements',
    icon: 'Moon',
    category: 'innovation',
  },
  {
    id: 'ai_integration_scout',
    name: 'AI Integration Scout',
    description: 'Find AI/ML integration opportunities',
    icon: 'Brain',
    category: 'innovation',
  },
  // Analysis & Insights
  {
    id: 'insight_synth',
    name: 'Insight Synthesizer',
    description: 'Deep analysis and pattern recognition',
    icon: 'Lightbulb',
    category: 'architecture',
  },
  {
    id: 'ambiguity_guardian',
    name: 'Ambiguity Guardian',
    description: 'Clarify unclear code and improve documentation',
    icon: 'HelpCircle',
    category: 'quality',
  },
  // Developer Experience
  {
    id: 'dev_experience_engineer',
    name: 'DX Engineer',
    description: 'Improve developer experience and tooling',
    icon: 'Wrench',
    category: 'quality',
  },
  {
    id: 'data_flow_optimizer',
    name: 'Data Flow Optimizer',
    description: 'Optimize data flow and state management',
    icon: 'GitMerge',
    category: 'architecture',
  },
  {
    id: 'code_refactor',
    name: 'Code Refactorer',
    description: 'Comprehensive code cleanup and refactoring',
    icon: 'RefreshCw',
    category: 'quality',
  },
];

// ============================================================================
// Business Analyzers
// ============================================================================

export const BUSINESS_ANALYZERS: ComponentMeta[] = [
  {
    id: 'idea-generator-analyzer',
    componentId: 'analyzer.idea-generator',
    type: 'analyzer',
    category: 'business',
    name: 'Idea Generator',
    description: 'Generate improvement ideas using AI prompts. Select a prompt persona to analyze your codebase and generate actionable suggestions.',
    icon: 'Lightbulb',
    color: '#fbbf24',
    tags: ['ai', 'ideas', 'suggestions'],
    compatibleProcessors: ['filter', 'group', 'priority', 'batch'],
    availablePrompts: BUSINESS_PROMPTS,
  },
];

// ============================================================================
// Processors
// ============================================================================

export const PROCESSORS: ComponentMeta[] = [
  {
    id: 'filter-processor',
    componentId: 'processor.filter',
    type: 'processor',
    category: 'technical',
    name: 'Filter',
    description: 'Filter issues by severity, category, or file patterns',
    icon: 'Filter',
    color: '#8b5cf6',
    tags: ['filter', 'severity', 'category'],
    configSchema: {
      minSeverity: { type: 'select', options: ['low', 'medium', 'high', 'critical'] },
      categories: { type: 'multiselect', options: [] },
      excludePatterns: { type: 'array' },
    },
  },
  {
    id: 'group-processor',
    componentId: 'processor.group',
    type: 'processor',
    category: 'technical',
    name: 'Group',
    description: 'Group issues by file, category, or severity level',
    icon: 'Folder',
    color: '#06b6d4',
    tags: ['group', 'organize', 'structure'],
    configSchema: {
      groupBy: { type: 'select', options: ['file', 'category', 'severity'] },
    },
  },
  {
    id: 'priority-processor',
    componentId: 'processor.priority',
    type: 'processor',
    category: 'technical',
    name: 'Prioritize',
    description: 'Sort issues by impact/effort ratio or custom priority',
    icon: 'ArrowUpDown',
    color: '#f59e0b',
    tags: ['priority', 'sort', 'order'],
    configSchema: {
      sortBy: { type: 'select', options: ['severity', 'autofix-first', 'impact-effort'] },
    },
  },
  {
    id: 'batch-processor',
    componentId: 'processor.batch',
    type: 'processor',
    category: 'technical',
    name: 'Batch',
    description: 'Create execution batches for parallel processing',
    icon: 'Layers',
    color: '#10b981',
    tags: ['batch', 'parallel', 'execution'],
    configSchema: {
      batchSize: { type: 'number', min: 1, max: 100 },
      groupByFile: { type: 'boolean' },
      groupByCategory: { type: 'boolean' },
    },
  },
  {
    id: 'merge-processor',
    componentId: 'processor.merge',
    type: 'processor',
    category: 'technical',
    name: 'Merge',
    description: 'Combine multiple issue arrays and deduplicate',
    icon: 'GitMerge',
    color: '#ec4899',
    tags: ['merge', 'combine', 'dedupe'],
    configSchema: {
      deduplicateByLine: { type: 'boolean' },
      deduplicateByContent: { type: 'boolean' },
    },
  },
];

// ============================================================================
// Executors
// ============================================================================

export const EXECUTORS: ComponentMeta[] = [
  {
    id: 'requirement-executor',
    componentId: 'executor.requirement',
    type: 'executor',
    category: 'technical',
    name: 'Claude Code Requirements',
    description: 'Generate requirement files for Claude Code to execute fixes',
    icon: 'FileCode',
    color: '#6366f1',
    tags: ['claude', 'requirements', 'autofix'],
    configSchema: {
      batchSize: { type: 'number', min: 1, max: 50 },
      includeGitCommands: { type: 'boolean' },
    },
  },
];

// Note: Decision Gate is now a toggle switch in the Evidence Panel,
// not an executor. Use the useDecisionGate prop to enable/disable it.

// ============================================================================
// Registry Functions
// ============================================================================

export function getAllAnalyzers(): ComponentMeta[] {
  return [...TECHNICAL_ANALYZERS, ...BUSINESS_ANALYZERS];
}

export function getAnalyzersByCategory(category: AnalyzerCategory): ComponentMeta[] {
  return getAllAnalyzers().filter(a => a.category === category);
}

export function getCompatibleProcessors(analyzer: ComponentMeta): ComponentMeta[] {
  if (!analyzer.compatibleProcessors) return PROCESSORS;
  return PROCESSORS.filter(p =>
    analyzer.compatibleProcessors!.includes(p.id.replace('-processor', ''))
  );
}

export function getComponentById(id: string): ComponentMeta | undefined {
  return [...getAllAnalyzers(), ...PROCESSORS, ...EXECUTORS].find(c => c.id === id);
}

export function getPromptById(id: string): PromptMeta | undefined {
  return BUSINESS_PROMPTS.find(p => p.id === id);
}

export function getPromptsByCategory(category: PromptMeta['category']): PromptMeta[] {
  return BUSINESS_PROMPTS.filter(p => p.category === category);
}
