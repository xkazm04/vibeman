/**
 * Unit tests for Code Generation Validators
 *
 * These tests document the expected behavior of each validator function.
 *
 * Run with: npx jest src/app/features/Concierge/lib/validators.test.ts
 */

/// <reference types="jest" />

import { GeneratedCode } from '@/app/db';
import {
  validateNoAbsolutePaths,
  validateTypeScriptTypes,
  validateErrorHandling,
  validateNextJsConventions,
  validateGeneratedCode,
  validateGeneratedCodeDetailed,
  composeValidators,
  ValidationResult,
} from './validators';

// Helper to create a mock GeneratedCode entry
function createMockCode(overrides: Partial<GeneratedCode> = {}): GeneratedCode {
  return {
    file_path: 'src/components/Button.tsx',
    content: 'export default function Button() { return <button>Click</button>; }',
    action: 'create',
    description: 'A button component',
    ...overrides,
  };
}

describe('validateNoAbsolutePaths', () => {
  it('should pass for relative paths', () => {
    const code = createMockCode({ file_path: 'src/components/Button.tsx' });
    const result = validateNoAbsolutePaths(code, 0);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should fail for Unix absolute paths', () => {
    const code = createMockCode({ file_path: '/Users/project/src/Button.tsx' });
    const result = validateNoAbsolutePaths(code, 0);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Should use relative path');
    expect(result.errors[0]).toContain('/Users/project/src/Button.tsx');
  });

  it('should fail for Windows absolute paths', () => {
    const code = createMockCode({ file_path: 'C:\\Projects\\src\\Button.tsx' });
    const result = validateNoAbsolutePaths(code, 0);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Should use relative path');
  });

  it('should include file index in error message', () => {
    const code = createMockCode({ file_path: '/absolute/path.ts' });
    const result = validateNoAbsolutePaths(code, 5);

    expect(result.errors[0]).toContain('File 5:');
  });
});

describe('validateTypeScriptTypes', () => {
  it('should pass for TypeScript file with interface', () => {
    const code = createMockCode({
      file_path: 'src/types.ts',
      content: 'interface User { name: string; }',
      action: 'create',
    });
    const result = validateTypeScriptTypes(code, 0);

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should pass for TypeScript file with type definition', () => {
    const code = createMockCode({
      file_path: 'src/types.ts',
      content: 'type UserId = string;',
      action: 'create',
    });
    const result = validateTypeScriptTypes(code, 0);

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should warn for new TypeScript file without types', () => {
    const code = createMockCode({
      file_path: 'src/utils.ts',
      content: 'function doSomething() { return 42; }',
      action: 'create',
    });
    const result = validateTypeScriptTypes(code, 0);

    expect(result.valid).toBe(true); // Warning, not error
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('might benefit from type definitions');
  });

  it('should not warn for modified files without types', () => {
    const code = createMockCode({
      file_path: 'src/utils.ts',
      content: 'function doSomething() { return 42; }',
      action: 'modify',
    });
    const result = validateTypeScriptTypes(code, 0);

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should not warn for non-TypeScript files', () => {
    const code = createMockCode({
      file_path: 'src/utils.js',
      content: 'function doSomething() { return 42; }',
      action: 'create',
    });
    const result = validateTypeScriptTypes(code, 0);

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('validateErrorHandling', () => {
  it('should pass for async function with try-catch', () => {
    const code = createMockCode({
      content: `
        async function fetchData() {
          try {
            const response = await fetch('/api');
            return response.json();
          } catch (error) {
            console.error(error);
          }
        }
      `,
    });
    const result = validateErrorHandling(code, 0);

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should warn for async function without try-catch', () => {
    const code = createMockCode({
      content: `
        async function fetchData() {
          const response = await fetch('/api');
          return response.json();
        }
      `,
    });
    const result = validateErrorHandling(code, 0);

    expect(result.valid).toBe(true); // Warning, not error
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('missing try-catch error handling');
  });

  it('should pass for synchronous functions', () => {
    const code = createMockCode({
      content: 'function calculate() { return 2 + 2; }',
    });
    const result = validateErrorHandling(code, 0);

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('validateNextJsConventions', () => {
  describe('path alias validation', () => {
    it('should pass for src file using @/ path alias', () => {
      const code = createMockCode({
        file_path: 'src/components/Button.tsx',
        content: `
          import { cn } from '@/lib/utils';
          export default function Button() { return <button>Click</button>; }
        `,
      });
      const result = validateNextJsConventions(code, 0);

      expect(result.warnings.filter(w => w.includes('path alias'))).toHaveLength(0);
    });

    it('should warn for src file not using @/ path alias', () => {
      const code = createMockCode({
        file_path: 'src/components/Button.tsx',
        content: `
          import { cn } from '../lib/utils';
          export default function Button() { return <button>Click</button>; }
        `,
      });
      const result = validateNextJsConventions(code, 0);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Consider using @/ path alias');
    });
  });

  describe('page component validation', () => {
    it('should pass for page with default export', () => {
      const code = createMockCode({
        file_path: 'app/dashboard/page.tsx',
        content: `
          import { cn } from '@/lib/utils';
          export default function DashboardPage() { return <div>Dashboard</div>; }
        `,
      });
      const result = validateNextJsConventions(code, 0);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for page without default export', () => {
      const code = createMockCode({
        file_path: 'app/dashboard/page.tsx',
        content: `
          import { cn } from '@/lib/utils';
          export const DashboardPage = () => { return <div>Dashboard</div>; };
        `,
      });
      const result = validateNextJsConventions(code, 0);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('must have default export');
    });
  });
});

describe('composeValidators', () => {
  it('should combine multiple validators', () => {
    const composedValidator = composeValidators(
      validateNoAbsolutePaths,
      validateTypeScriptTypes
    );

    const code = createMockCode({
      file_path: '/absolute/path.ts',
      content: 'function noTypes() {}',
      action: 'create',
    });

    const result = composedValidator(code, 0);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should be valid when all validators pass', () => {
    const composedValidator = composeValidators(
      validateNoAbsolutePaths,
      validateTypeScriptTypes
    );

    const code = createMockCode({
      file_path: 'src/types.ts',
      content: 'interface User { name: string; }',
      action: 'create',
    });

    const result = composedValidator(code, 0);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('validateGeneratedCode', () => {
  it('should validate multiple files', () => {
    const codeFiles: GeneratedCode[] = [
      createMockCode({
        file_path: 'src/components/Button.tsx',
        content: 'import { cn } from "@/lib/utils"; export default function Button() {}',
        action: 'create',
      }),
      createMockCode({
        file_path: '/absolute/path.ts',
        content: 'function test() {}',
        action: 'create',
      }),
    ];

    const result = validateGeneratedCode(codeFiles);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should pass for valid code', () => {
    const codeFiles: GeneratedCode[] = [
      createMockCode({
        file_path: 'src/components/Button.tsx',
        content: `
          import { cn } from '@/lib/utils';
          interface ButtonProps { label: string; }
          export default function Button({ label }: ButtonProps) {
            return <button>{label}</button>;
          }
        `,
        action: 'create',
      }),
    ];

    const result = validateGeneratedCode(codeFiles);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return empty result for empty array', () => {
    const result = validateGeneratedCode([]);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('validateGeneratedCodeDetailed', () => {
  it('should return results per validator', () => {
    const codeFiles: GeneratedCode[] = [
      createMockCode({
        file_path: '/absolute/utils.ts',
        content: 'async function fetch() { await api.get(); }',
        action: 'create',
      }),
    ];

    const result = validateGeneratedCodeDetailed(codeFiles);

    expect(result.validatorResults).toBeDefined();
    expect(result.validatorResults.absolutePaths).toBeDefined();
    expect(result.validatorResults.absolutePaths.errors.length).toBeGreaterThan(0);
    expect(result.validatorResults.errorHandling.warnings.length).toBeGreaterThan(0);
  });

  it('should aggregate all errors and warnings', () => {
    const codeFiles: GeneratedCode[] = [
      createMockCode({
        file_path: '/absolute/path.ts',
        content: 'async function test() { await fetch(); }',
        action: 'create',
      }),
    ];

    const result = validateGeneratedCodeDetailed(codeFiles);

    // Should have both the absolute path error and the async/type warnings
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.valid).toBe(false);
  });
});
