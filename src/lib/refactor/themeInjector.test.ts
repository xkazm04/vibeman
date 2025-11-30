/**
 * Property-Based Tests for Theme Hook Injector
 * 
 * **Feature: theme-token-refactor, Property 3: Theme hook injection**
 * **Validates: Requirements 3.1, 3.2, 6.1, 6.2**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  analyzeThemeHookUsage,
  injectThemeHook,
  injectImport,
  injectHookUsage,
  findImportInsertPosition,
  findHookInsertPosition,
  THEME_STORE_IMPORT,
  THEME_HOOK_USAGE,
} from './themeInjector';

/**
 * Generates a valid React component structure
 */
const componentNameArb = fc.stringMatching(/^[A-Z][a-zA-Z0-9]*$/);

const generateComponent = (name: string, hasExistingImport: boolean, hasExistingHook: boolean): string => {
  const imports = [
    "import React from 'react';",
    hasExistingImport ? THEME_STORE_IMPORT : '',
  ].filter(Boolean).join('\n');
  
  const hookUsage = hasExistingHook ? `  ${THEME_HOOK_USAGE}` : '';
  
  return `${imports}

export default function ${name}() {
${hookUsage}
  return (
    <div className="text-cyan-400">
      Hello
    </div>
  );
}
`;
};

describe('Theme Hook Injector - Property Tests', () => {
  /**
   * **Feature: theme-token-refactor, Property 3: Theme hook injection**
   * 
   * For any component that uses theme colors after transformation, the component
   * SHALL contain the useThemeStore import and properly destructure colors via getThemeColors().
   */

  it('should detect existing useThemeStore import', () => {
    fc.assert(
      fc.property(
        componentNameArb,
        fc.boolean(),
        (name, hasImport) => {
          const content = generateComponent(name, hasImport, false);
          const analysis = analyzeThemeHookUsage(content);
          
          expect(analysis.hasImport).toBe(hasImport);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should detect existing getThemeColors hook usage', () => {
    fc.assert(
      fc.property(
        componentNameArb,
        fc.boolean(),
        (name, hasHook) => {
          // Must have import if has hook for valid code
          const content = generateComponent(name, hasHook, hasHook);
          const analysis = analyzeThemeHookUsage(content);
          
          expect(analysis.hasHookUsage).toBe(hasHook);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should add import when missing', () => {
    fc.assert(
      fc.property(
        componentNameArb,
        (name) => {
          const content = generateComponent(name, false, false);
          const result = injectImport(content);
          
          expect(result.added).toBe(true);
          expect(result.content).toContain(THEME_STORE_IMPORT);
          
          // Verify the import is properly placed
          const analysis = analyzeThemeHookUsage(result.content);
          expect(analysis.hasImport).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not duplicate import when already present', () => {
    fc.assert(
      fc.property(
        componentNameArb,
        (name) => {
          const content = generateComponent(name, true, false);
          const result = injectImport(content);
          
          expect(result.added).toBe(false);
          
          // Count occurrences of import
          const importCount = (result.content.match(new RegExp(THEME_STORE_IMPORT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
          expect(importCount).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should add hook usage when missing', () => {
    fc.assert(
      fc.property(
        componentNameArb,
        (name) => {
          const content = generateComponent(name, true, false);
          const result = injectHookUsage(content);
          
          expect(result.added).toBe(true);
          expect(result.content).toContain(THEME_HOOK_USAGE);
          
          // Verify the hook is properly placed
          const analysis = analyzeThemeHookUsage(result.content);
          expect(analysis.hasHookUsage).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not duplicate hook usage when already present', () => {
    fc.assert(
      fc.property(
        componentNameArb,
        (name) => {
          const content = generateComponent(name, true, true);
          const result = injectHookUsage(content);
          
          expect(result.added).toBe(false);
          
          // Count occurrences of hook usage
          const hookCount = (result.content.match(/getThemeColors\s*\}\s*=\s*useThemeStore/g) || []).length;
          expect(hookCount).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });


  it('should inject both import and hook when both are missing', () => {
    fc.assert(
      fc.property(
        componentNameArb,
        (name) => {
          const content = generateComponent(name, false, false);
          const result = injectThemeHook(content);
          
          expect(result.importAdded).toBe(true);
          expect(result.hookUsageAdded).toBe(true);
          expect(result.transformedContent).toContain(THEME_STORE_IMPORT);
          expect(result.transformedContent).toContain(THEME_HOOK_USAGE);
          
          // Verify both are properly placed
          const analysis = analyzeThemeHookUsage(result.transformedContent);
          expect(analysis.hasImport).toBe(true);
          expect(analysis.hasHookUsage).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should place import after existing imports', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        componentNameArb,
        (importCount, name) => {
          // Generate content with multiple imports
          const imports = Array.from({ length: importCount }, (_, i) => 
            `import { thing${i} } from 'module${i}';`
          ).join('\n');
          
          const content = `${imports}

export default function ${name}() {
  return <div>Hello</div>;
}
`;
          
          const position = findImportInsertPosition(content);
          
          // Position should be after all existing imports
          expect(position).toBe(importCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should place hook usage inside component body', () => {
    fc.assert(
      fc.property(
        componentNameArb,
        (name) => {
          const content = generateComponent(name, true, false);
          const result = injectHookUsage(content);
          
          // The hook should be inside the function body
          const lines = result.content.split('\n');
          const hookLineIndex = lines.findIndex(line => line.includes(THEME_HOOK_USAGE));
          const functionLineIndex = lines.findIndex(line => line.includes(`function ${name}`));
          
          expect(hookLineIndex).toBeGreaterThan(functionLineIndex);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve original content structure', () => {
    fc.assert(
      fc.property(
        componentNameArb,
        (name) => {
          const content = generateComponent(name, false, false);
          const result = injectThemeHook(content);
          
          // Original component name should still be present
          expect(result.transformedContent).toContain(`function ${name}`);
          
          // Original JSX should still be present
          expect(result.transformedContent).toContain('text-cyan-400');
          expect(result.transformedContent).toContain('Hello');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should track changes correctly', () => {
    fc.assert(
      fc.property(
        componentNameArb,
        fc.boolean(),
        fc.boolean(),
        (name, hasImport, hasHook) => {
          // hasHook implies hasImport for valid code
          const actualHasHook = hasHook && hasImport;
          const content = generateComponent(name, hasImport, actualHasHook);
          const result = injectThemeHook(content);
          
          // Changes should match what was added
          const importChanges = result.changes.filter(c => c.type === 'import');
          const hookChanges = result.changes.filter(c => c.type === 'hook-usage');
          
          expect(importChanges.length).toBe(result.importAdded ? 1 : 0);
          expect(hookChanges.length).toBe(result.hookUsageAdded ? 1 : 0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
