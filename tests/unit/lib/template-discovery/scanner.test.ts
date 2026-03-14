/**
 * Template Scanner Tests
 * Validates path normalization and category extraction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only (it throws in non-Next.js environments)
vi.mock('server-only', () => ({}));

// Mock glob to avoid filesystem access
vi.mock('glob', () => ({
  glob: vi.fn().mockResolvedValue([]),
}));

describe('Template Scanner', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('discoverTemplateFiles', () => {
    it('should use normalizePath for project path in result', async () => {
      const { discoverTemplateFiles } = await import('@/lib/template-discovery/scanner');
      const result = await discoverTemplateFiles('C:\\Users\\test\\project');
      // projectPath in result should be normalized (forward slashes)
      expect(result.projectPath).toBe('C:/Users/test/project');
      expect(result.projectPath).not.toContain('\\');
    });

    it('should normalize discovered file paths with forward slashes', async () => {
      const { glob } = await import('glob');
      (glob as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        'src/templates/research/test.ts',
      ]);

      const { discoverTemplateFiles } = await import('@/lib/template-discovery/scanner');
      const result = await discoverTemplateFiles('C:\\Users\\test\\project');

      expect(result.files.length).toBe(1);
      // File path should be fully normalized
      expect(result.files[0].filePath).not.toContain('\\');
      expect(result.files[0].filePath).toBe('C:/Users/test/project/src/templates/research/test.ts');
    });
  });

  describe('extractCategory', () => {
    it('should extract category from normalized path', async () => {
      const { glob } = await import('glob');
      (glob as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        'src/templates/research/test.ts',
      ]);

      const { discoverTemplateFiles } = await import('@/lib/template-discovery/scanner');
      const result = await discoverTemplateFiles('/test/project');

      expect(result.files[0].category).toBe('research');
    });

    it('should map configs folder to general category', async () => {
      const { glob } = await import('glob');
      (glob as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        'src/templates/configs/test.ts',
      ]);

      const { discoverTemplateFiles } = await import('@/lib/template-discovery/scanner');
      const result = await discoverTemplateFiles('/test/project');

      expect(result.files[0].category).toBe('general');
    });
  });
});
