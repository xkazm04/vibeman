/**
 * Property-Based Tests for Component Extractor
 * 
 * **Feature: theme-token-refactor, Property 5: Extraction preserves interface**
 * **Validates: Requirements 4.3, 4.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  extractVariableReferences,
  createPropDefinitions,
  generatePropsInterface,
  generateComponentContent,
  findRenderFunctions,
  generateImportStatement,
  extractComponents,
  PropDefinition,
} from './componentExtractor';

describe('Component Extractor - Property Tests', () => {
  /**
   * **Feature: theme-token-refactor, Property 5: Extraction preserves interface**
   * 
   * For any extracted component, the original file SHALL import the extracted 
   * component, and the extracted component SHALL expose the same props interface 
   * as the original inline implementation.
   */
  it('should preserve all variable references as props in extracted component', () => {
    fc.assert(
      fc.property(
        // Generate random variable names
        fc.array(
          fc.string({ minLength: 1, maxLength: 10 })
            .filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          { minLength: 1, maxLength: 5 }
        ),
        (varNames) => {
          // Create JSX content with these variables
          const jsxContent = varNames.map(v => `<div>{${v}}</div>`).join('\n');
          
          // Extract variable references
          const refs = extractVariableReferences(jsxContent);
          
          // All original variables should be found
          for (const varName of varNames) {
            expect(refs).toContain(varName);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate props interface with all extracted variables', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 10 })
            .filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          { minLength: 1, maxLength: 5 }
        ),
        (varNames) => {
          const uniqueVars = [...new Set(varNames)];
          const jsxContent = uniqueVars.map(v => `<div>{${v}}</div>`).join('\n');
          
          const props = createPropDefinitions(uniqueVars, jsxContent);
          const propsInterface = generatePropsInterface('TestComponent', props);
          
          // All variables should appear in the interface
          for (const varName of uniqueVars) {
            expect(propsInterface).toContain(varName);
          }
        }
      ),
      { numRuns: 100 }
    );
  });


  it('should generate component with destructured props matching interface', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 10 })
            .filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          { minLength: 1, maxLength: 5 }
        ),
        fc.string({ minLength: 3, maxLength: 15 })
          .filter(s => /^[A-Z][a-zA-Z0-9]*$/.test(s)),
        (varNames, componentName) => {
          const uniqueVars = [...new Set(varNames)];
          const jsxContent = '<div>test</div>';
          const props: PropDefinition[] = uniqueVars.map(name => ({
            name,
            type: 'unknown',
            optional: false,
          }));
          
          const componentContent = generateComponentContent(
            componentName,
            props,
            jsxContent,
            []
          );
          
          // Component should have all props in destructuring
          for (const varName of uniqueVars) {
            expect(componentContent).toContain(varName);
          }
          
          // Component should have the correct name
          expect(componentContent).toContain(`function ${componentName}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate valid import statement for extracted component', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 15 })
          .filter(s => /^[A-Z][a-zA-Z0-9]*$/.test(s)),
        fc.string({ minLength: 1, maxLength: 20 })
          .filter(s => /^[a-zA-Z0-9./_-]+$/.test(s)),
        (componentName, relativePath) => {
          const importStatement = generateImportStatement(componentName, relativePath);
          
          // Import should contain component name
          expect(importStatement).toContain(componentName);
          
          // Import should contain path
          expect(importStatement).toContain(relativePath);
          
          // Import should be valid syntax
          expect(importStatement).toMatch(/^import\s*\{.*\}\s*from\s*['"].*['"];?$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should find render functions and extract their names', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 3, maxLength: 10 })
            .filter(s => /^[A-Z][a-zA-Z0-9]*$/.test(s)),
          { minLength: 1, maxLength: 3 }
        ),
        (componentNames) => {
          const uniqueNames = [...new Set(componentNames)];
          
          // Create content with render functions
          const content = uniqueNames.map(name => 
            `const render${name} = () => {\n  return <div>${name}</div>;\n};`
          ).join('\n\n');
          
          const candidates = findRenderFunctions(content);
          
          // Should find all render functions
          const foundNames = candidates.map(c => c.name);
          for (const name of uniqueNames) {
            expect(foundNames).toContain(name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Component Extractor - Helper Functions', () => {
  it('should extract handler references correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 10 })
            .filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
          { minLength: 1, maxLength: 3 }
        ),
        (handlerNames) => {
          const uniqueHandlers = [...new Set(handlerNames)];
          const jsxContent = uniqueHandlers
            .map(h => `<button onClick={${h}}>Click</button>`)
            .join('\n');
          
          const refs = extractVariableReferences(jsxContent);
          
          for (const handler of uniqueHandlers) {
            expect(refs).toContain(handler);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should infer handler type for handle* prefixed variables', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 })
          .filter(s => /^[A-Z][a-zA-Z0-9]*$/.test(s)),
        (suffix) => {
          const varName = `handle${suffix}`;
          const jsxContent = `<button onClick={${varName}}>Click</button>`;
          
          const props = createPropDefinitions([varName], jsxContent);
          
          expect(props[0].type).toBe('() => void');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should infer boolean type for is* prefixed variables', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 })
          .filter(s => /^[A-Z][a-zA-Z0-9]*$/.test(s)),
        (suffix) => {
          const varName = `is${suffix}`;
          const jsxContent = `<div>{${varName}}</div>`;
          
          const props = createPropDefinitions([varName], jsxContent);
          
          expect(props[0].type).toBe('boolean');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate empty interface for components with no props', () => {
    const propsInterface = generatePropsInterface('EmptyComponent', []);
    expect(propsInterface).toBe('');
  });
});
