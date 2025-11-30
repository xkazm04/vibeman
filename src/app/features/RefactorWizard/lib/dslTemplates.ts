/**
 * Predefined DSL Templates
 *
 * Common refactoring patterns as ready-to-use templates that users can
 * select and customize through the visual DSL builder.
 */

import type { RefactorSpec, TransformationRule } from './dslTypes';
import { RefactorTemplate } from './dslTypes';

// Re-export RefactorTemplate for consumers
export type { RefactorTemplate } from './dslTypes';

// ============================================================================
// MIGRATION TEMPLATES
// ============================================================================

export const classToFunctionTemplate: RefactorTemplate = {
  id: 'class-to-function',
  name: 'Convert Class Components to Functions',
  description: 'Transform React class components into modern functional components with hooks',
  category: 'migration',
  tags: ['react', 'hooks', 'modernization'],
  spec: {
    version: '1.0',
    name: 'Class to Function Components',
    description: 'Convert all React class components to functional components with hooks',
    scope: {
      include: ['src/**/*.{tsx,jsx}'],
      exclude: ['node_modules/**', '**/*.test.*', '**/*.spec.*'],
      fileTypes: ['tsx', 'jsx'],
    },
    transformations: [
      {
        id: 'class-to-function-main',
        name: 'Convert class component to function',
        description: 'Transform class extends React.Component to function component',
        type: 'upgrade-syntax',
        pattern: {
          type: 'ast',
          match: 'class $NAME extends (React.Component|Component)',
        },
        replacement: {
          template: 'function $NAME(props)',
          addImports: [{ from: 'react', named: ['useState', 'useEffect'] }],
        },
        impact: 'high',
        priority: 10,
      },
      {
        id: 'state-to-useState',
        name: 'Convert state to useState',
        description: 'Transform this.state to useState hooks',
        type: 'migrate-api',
        pattern: {
          type: 'ast',
          match: 'this.state.$PROP',
        },
        replacement: {
          template: '$PROP',
        },
        impact: 'medium',
        priority: 8,
      },
      {
        id: 'lifecycle-to-useEffect',
        name: 'Convert lifecycle methods to useEffect',
        description: 'Transform componentDidMount/componentDidUpdate to useEffect',
        type: 'migrate-api',
        pattern: {
          type: 'ast',
          match: 'componentDidMount() { $BODY }',
        },
        replacement: {
          template: 'useEffect(() => { $BODY }, [])',
        },
        impact: 'high',
        priority: 9,
      },
    ],
    execution: {
      mode: 'preview',
      runTestsAfterEach: true,
      typeCheck: true,
      stopOnError: true,
    },
    metadata: {
      tags: ['react', 'hooks', 'class-components', 'functional-components'],
      templateCategory: 'migration',
      effort: 'medium',
      riskLevel: 'medium',
    },
  },
};

export const commonjsToEsmTemplate: RefactorTemplate = {
  id: 'commonjs-to-esm',
  name: 'CommonJS to ES Modules',
  description: 'Convert require/module.exports to import/export syntax',
  category: 'migration',
  tags: ['esm', 'modules', 'modernization'],
  spec: {
    version: '1.0',
    name: 'CommonJS to ES Modules',
    description: 'Convert all CommonJS syntax to ES module syntax',
    scope: {
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: ['node_modules/**', '*.config.js', '*.config.ts'],
      fileTypes: ['ts', 'tsx', 'js', 'jsx'],
    },
    transformations: [
      {
        id: 'require-to-import',
        name: 'Convert require to import',
        type: 'regex-replace',
        pattern: {
          type: 'regex',
          match: "const\\s+(\\w+)\\s*=\\s*require\\(['\"](.+?)['\"]\\)",
        },
        replacement: {
          template: "import $1 from '$2'",
        },
        impact: 'medium',
        priority: 10,
      },
      {
        id: 'destructure-require-to-import',
        name: 'Convert destructured require to named import',
        type: 'regex-replace',
        pattern: {
          type: 'regex',
          match: "const\\s*\\{\\s*(.+?)\\s*\\}\\s*=\\s*require\\(['\"](.+?)['\"]\\)",
        },
        replacement: {
          template: "import { $1 } from '$2'",
        },
        impact: 'medium',
        priority: 9,
      },
      {
        id: 'module-exports-to-export',
        name: 'Convert module.exports to export',
        type: 'regex-replace',
        pattern: {
          type: 'regex',
          match: 'module\\.exports\\s*=\\s*(\\w+)',
        },
        replacement: {
          template: 'export default $1',
        },
        impact: 'medium',
        priority: 8,
      },
      {
        id: 'exports-dot-to-named-export',
        name: 'Convert exports.x to named export',
        type: 'regex-replace',
        pattern: {
          type: 'regex',
          match: 'exports\\.(\\w+)\\s*=\\s*',
        },
        replacement: {
          template: 'export const $1 = ',
        },
        impact: 'medium',
        priority: 7,
      },
    ],
    metadata: {
      tags: ['commonjs', 'esm', 'modules', 'imports'],
      templateCategory: 'migration',
      effort: 'small',
      riskLevel: 'low',
    },
  },
};

// ============================================================================
// CLEANUP TEMPLATES
// ============================================================================

export const removeConsoleLogsTemplate: RefactorTemplate = {
  id: 'remove-console-logs',
  name: 'Remove Console Logs',
  description: 'Remove all console.log, console.warn, console.error statements',
  category: 'cleanup',
  tags: ['cleanup', 'console', 'production'],
  spec: {
    version: '1.0',
    name: 'Remove Console Logs',
    description: 'Remove all console logging statements for production',
    scope: {
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: ['node_modules/**', '**/*.test.*', '**/*.spec.*'],
    },
    transformations: [
      {
        id: 'remove-console-log',
        name: 'Remove console.log',
        type: 'regex-replace',
        pattern: {
          type: 'regex',
          match: "console\\.log\\([^)]*\\);?\\s*",
        },
        replacement: {
          template: '',
        },
        impact: 'low',
        priority: 10,
      },
      {
        id: 'remove-console-warn',
        name: 'Remove console.warn',
        type: 'regex-replace',
        pattern: {
          type: 'regex',
          match: "console\\.warn\\([^)]*\\);?\\s*",
        },
        replacement: {
          template: '',
        },
        impact: 'low',
        priority: 9,
      },
      {
        id: 'remove-console-error',
        name: 'Remove console.error',
        type: 'regex-replace',
        pattern: {
          type: 'regex',
          match: "console\\.error\\([^)]*\\);?\\s*",
        },
        replacement: {
          template: '',
        },
        impact: 'low',
        priority: 8,
      },
      {
        id: 'remove-console-debug',
        name: 'Remove console.debug',
        type: 'regex-replace',
        pattern: {
          type: 'regex',
          match: "console\\.debug\\([^)]*\\);?\\s*",
        },
        replacement: {
          template: '',
        },
        impact: 'low',
        priority: 7,
      },
    ],
    metadata: {
      tags: ['cleanup', 'console', 'logging', 'production-ready'],
      templateCategory: 'cleanup',
      effort: 'small',
      riskLevel: 'low',
    },
  },
};

export const removeDeadCodeTemplate: RefactorTemplate = {
  id: 'remove-dead-code',
  name: 'Remove Dead Code',
  description: 'Identify and remove unused imports, variables, and functions',
  category: 'cleanup',
  tags: ['cleanup', 'dead-code', 'unused'],
  spec: {
    version: '1.0',
    name: 'Remove Dead Code',
    description: 'Remove unused imports, variables, and functions',
    scope: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/**'],
      fileTypes: ['ts', 'tsx'],
    },
    transformations: [
      {
        id: 'remove-unused-imports',
        name: 'Remove unused imports',
        type: 'remove-dead-code',
        pattern: {
          type: 'semantic',
          match: 'unused_import',
        },
        impact: 'low',
        priority: 10,
      },
      {
        id: 'remove-unused-variables',
        name: 'Remove unused variables',
        type: 'remove-dead-code',
        pattern: {
          type: 'semantic',
          match: 'unused_variable',
        },
        impact: 'low',
        priority: 9,
      },
      {
        id: 'remove-unused-functions',
        name: 'Remove unused functions',
        type: 'remove-dead-code',
        pattern: {
          type: 'semantic',
          match: 'unused_function',
        },
        impact: 'medium',
        priority: 8,
      },
    ],
    execution: {
      mode: 'preview',
      runTestsAfterEach: true,
      typeCheck: true,
    },
    metadata: {
      tags: ['cleanup', 'dead-code', 'tree-shaking'],
      templateCategory: 'cleanup',
      effort: 'small',
      riskLevel: 'low',
    },
  },
};

// ============================================================================
// PERFORMANCE TEMPLATES
// ============================================================================

export const addMemoizationTemplate: RefactorTemplate = {
  id: 'add-memoization',
  name: 'Add React Memoization',
  description: 'Add useMemo, useCallback, and React.memo for performance optimization',
  category: 'performance',
  tags: ['react', 'performance', 'memoization'],
  spec: {
    version: '1.0',
    name: 'Add Memoization',
    description: 'Add memoization to expensive computations and callbacks',
    scope: {
      include: ['src/**/*.{tsx,jsx}'],
      exclude: ['node_modules/**', '**/*.test.*'],
      fileTypes: ['tsx', 'jsx'],
    },
    transformations: [
      {
        id: 'wrap-expensive-computation',
        name: 'Wrap expensive computations with useMemo',
        type: 'add-memoization',
        pattern: {
          type: 'semantic',
          match: 'expensive_computation_in_render',
        },
        replacement: {
          addImports: [{ from: 'react', named: ['useMemo'] }],
        },
        impact: 'medium',
        priority: 10,
      },
      {
        id: 'wrap-callback-props',
        name: 'Wrap callback props with useCallback',
        type: 'add-memoization',
        pattern: {
          type: 'semantic',
          match: 'inline_callback_prop',
        },
        replacement: {
          addImports: [{ from: 'react', named: ['useCallback'] }],
        },
        impact: 'medium',
        priority: 9,
      },
      {
        id: 'memo-pure-component',
        name: 'Wrap pure components with React.memo',
        type: 'add-memoization',
        pattern: {
          type: 'semantic',
          match: 'pure_functional_component',
        },
        replacement: {
          addImports: [{ from: 'react', named: ['memo'] }],
        },
        impact: 'low',
        priority: 8,
      },
    ],
    execution: {
      mode: 'preview',
      runTestsAfterEach: true,
    },
    metadata: {
      tags: ['react', 'performance', 'useMemo', 'useCallback', 'memo'],
      templateCategory: 'performance',
      effort: 'medium',
      riskLevel: 'low',
    },
  },
};

// ============================================================================
// SECURITY TEMPLATES
// ============================================================================

export const sanitizeInputsTemplate: RefactorTemplate = {
  id: 'sanitize-inputs',
  name: 'Sanitize User Inputs',
  description: 'Add input sanitization to prevent XSS and injection attacks',
  category: 'security',
  tags: ['security', 'xss', 'sanitization'],
  spec: {
    version: '1.0',
    name: 'Sanitize User Inputs',
    description: 'Add proper sanitization to user-provided inputs',
    scope: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/**'],
    },
    transformations: [
      {
        id: 'sanitize-dangerouslySetInnerHTML',
        name: 'Sanitize dangerouslySetInnerHTML',
        description: 'Wrap dangerouslySetInnerHTML content with DOMPurify',
        type: 'regex-replace',
        pattern: {
          type: 'regex',
          match: 'dangerouslySetInnerHTML=\\{\\{\\s*__html:\\s*(.+?)\\s*\\}\\}',
        },
        replacement: {
          template: 'dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize($1) }}',
          addImports: [{ from: 'dompurify', default: 'DOMPurify' }],
        },
        impact: 'critical',
        priority: 10,
      },
      {
        id: 'encode-url-params',
        name: 'Encode URL parameters',
        type: 'regex-replace',
        pattern: {
          type: 'regex',
          match: "\\$\\{(.+?)\\}(?=.*[?&])",
        },
        replacement: {
          template: '${encodeURIComponent($1)}',
        },
        impact: 'high',
        priority: 9,
      },
    ],
    metadata: {
      tags: ['security', 'xss', 'sanitization', 'injection'],
      templateCategory: 'security',
      effort: 'medium',
      riskLevel: 'high',
    },
  },
};

export const addErrorBoundariesTemplate: RefactorTemplate = {
  id: 'add-error-boundaries',
  name: 'Add Error Boundaries',
  description: 'Wrap components with error boundaries to prevent crash propagation',
  category: 'security',
  tags: ['react', 'error-handling', 'resilience'],
  spec: {
    version: '1.0',
    name: 'Add Error Boundaries',
    description: 'Add error boundaries to catch and handle React errors gracefully',
    scope: {
      include: ['src/**/*.{tsx,jsx}'],
      exclude: ['node_modules/**'],
    },
    transformations: [
      {
        id: 'wrap-route-with-boundary',
        name: 'Wrap route components with error boundary',
        type: 'add-error-handling',
        pattern: {
          type: 'semantic',
          match: 'route_component',
        },
        impact: 'high',
        priority: 10,
      },
      {
        id: 'wrap-feature-with-boundary',
        name: 'Wrap feature components with error boundary',
        type: 'add-error-handling',
        pattern: {
          type: 'semantic',
          match: 'feature_component',
        },
        impact: 'medium',
        priority: 8,
      },
    ],
    metadata: {
      tags: ['react', 'error-boundary', 'error-handling'],
      templateCategory: 'security',
      effort: 'medium',
      riskLevel: 'low',
    },
  },
};

// ============================================================================
// ARCHITECTURE TEMPLATES
// ============================================================================

export const extractHooksTemplate: RefactorTemplate = {
  id: 'extract-custom-hooks',
  name: 'Extract Custom Hooks',
  description: 'Extract reusable logic from components into custom hooks',
  category: 'architecture',
  tags: ['react', 'hooks', 'reusability'],
  spec: {
    version: '1.0',
    name: 'Extract Custom Hooks',
    description: 'Identify and extract reusable logic into custom hooks',
    scope: {
      include: ['src/**/*.{tsx,jsx}'],
      exclude: ['node_modules/**', 'src/hooks/**'],
    },
    transformations: [
      {
        id: 'extract-fetch-logic',
        name: 'Extract data fetching logic',
        description: 'Extract useEffect + fetch patterns into useFetch hook',
        type: 'extract-hook',
        pattern: {
          type: 'semantic',
          match: 'fetch_in_useEffect',
        },
        replacement: {
          targetPath: 'src/hooks/useFetch.ts',
        },
        impact: 'medium',
        priority: 10,
      },
      {
        id: 'extract-form-logic',
        name: 'Extract form state logic',
        description: 'Extract form state management into useForm hook',
        type: 'extract-hook',
        pattern: {
          type: 'semantic',
          match: 'form_state_pattern',
        },
        replacement: {
          targetPath: 'src/hooks/useForm.ts',
        },
        impact: 'medium',
        priority: 9,
      },
      {
        id: 'extract-local-storage',
        name: 'Extract localStorage logic',
        description: 'Extract localStorage usage into useLocalStorage hook',
        type: 'extract-hook',
        pattern: {
          type: 'semantic',
          match: 'localStorage_usage',
        },
        replacement: {
          targetPath: 'src/hooks/useLocalStorage.ts',
        },
        impact: 'low',
        priority: 8,
      },
    ],
    metadata: {
      tags: ['react', 'hooks', 'custom-hooks', 'reusability'],
      templateCategory: 'architecture',
      effort: 'large',
      riskLevel: 'medium',
    },
  },
};

export const consolidateDuplicatesTemplate: RefactorTemplate = {
  id: 'consolidate-duplicates',
  name: 'Consolidate Duplicate Code',
  description: 'Identify and merge duplicate code patterns into shared utilities',
  category: 'architecture',
  tags: ['dry', 'duplication', 'utilities'],
  spec: {
    version: '1.0',
    name: 'Consolidate Duplicates',
    description: 'Find and consolidate duplicate code patterns',
    scope: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/**'],
    },
    transformations: [
      {
        id: 'consolidate-utility-functions',
        name: 'Consolidate duplicate utility functions',
        type: 'consolidate',
        pattern: {
          type: 'semantic',
          match: 'duplicate_function_pattern',
        },
        replacement: {
          targetPath: 'src/lib/utils.ts',
        },
        impact: 'medium',
        priority: 10,
      },
      {
        id: 'consolidate-api-patterns',
        name: 'Consolidate API call patterns',
        type: 'consolidate',
        pattern: {
          type: 'semantic',
          match: 'duplicate_api_pattern',
        },
        replacement: {
          targetPath: 'src/lib/api.ts',
        },
        impact: 'medium',
        priority: 9,
      },
    ],
    metadata: {
      tags: ['dry', 'duplication', 'refactoring'],
      templateCategory: 'architecture',
      effort: 'large',
      riskLevel: 'medium',
    },
  },
};

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

export const ALL_TEMPLATES: RefactorTemplate[] = [
  // Migration
  classToFunctionTemplate,
  commonjsToEsmTemplate,

  // Cleanup
  removeConsoleLogsTemplate,
  removeDeadCodeTemplate,

  // Performance
  addMemoizationTemplate,

  // Security
  sanitizeInputsTemplate,
  addErrorBoundariesTemplate,

  // Architecture
  extractHooksTemplate,
  consolidateDuplicatesTemplate,
];

export const TEMPLATES_BY_CATEGORY: Record<string, RefactorTemplate[]> = {
  migration: ALL_TEMPLATES.filter(t => t.category === 'migration'),
  cleanup: ALL_TEMPLATES.filter(t => t.category === 'cleanup'),
  performance: ALL_TEMPLATES.filter(t => t.category === 'performance'),
  security: ALL_TEMPLATES.filter(t => t.category === 'security'),
  architecture: ALL_TEMPLATES.filter(t => t.category === 'architecture'),
};

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): RefactorTemplate | undefined {
  return ALL_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): RefactorTemplate[] {
  return TEMPLATES_BY_CATEGORY[category] || [];
}

/**
 * Create a full spec from a template
 */
export function createSpecFromTemplate(template: RefactorTemplate): RefactorSpec {
  return {
    version: '1.0',
    name: template.name,
    description: template.description,
    scope: template.spec.scope || {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/**'],
    },
    transformations: template.spec.transformations || [],
    execution: template.spec.execution || {
      mode: 'preview',
      runTestsAfterEach: true,
      typeCheck: true,
    },
    validation: template.spec.validation || {
      runTests: true,
      runTypeCheck: true,
      runLint: true,
    },
    metadata: {
      ...template.spec.metadata,
      isTemplate: false,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  };
}
