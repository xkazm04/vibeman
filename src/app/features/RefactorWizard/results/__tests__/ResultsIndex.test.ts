import { describe, it, expect } from 'vitest';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { buildIndex, filterIds } from '../../results/ResultsIndex';

function make(id: string, overrides: Partial<RefactorOpportunity> = {}): RefactorOpportunity {
  return {
    id,
    title: overrides.title || `Title ${id}`,
    description: '',
    category: overrides.category || 'maintainability',
    severity: overrides.severity || 'medium',
    impact: '',
    effort: overrides.effort || 'low',
    files: overrides.files || [`/path/${id}.ts`],
    suggestedFix: undefined,
    autoFixAvailable: !!overrides.autoFixAvailable,
    estimatedTime: undefined,
  };
}

describe('ResultsIndex', () => {
  const items: RefactorOpportunity[] = [
    make('a', { category: 'performance', severity: 'high', files: ['/a.ts', '/b.ts'] }),
    make('b', { category: 'security', severity: 'critical', files: ['/sec.ts'] }),
    make('c', { category: 'maintainability', severity: 'low', files: ['/c.ts'] }),
    make('d', { category: 'code-quality', severity: 'medium', files: ['/d.ts'] }),
  ];

  it('builds indices by severity, category, and file', () => {
    const idx = buildIndex(items);
    expect(idx.bySeverity.get('high')).toContain('a');
    expect(idx.bySeverity.get('critical')).toContain('b');
    expect(idx.byCategory.get('security')).toContain('b');
    expect(idx.byFile.get('/a.ts')).toContain('a');
    expect(idx.byFile.get('/b.ts')).toContain('a');
  });

  it('filters by severity and category', () => {
    const idx = buildIndex(items);
    const ids = filterIds(idx, items, 'critical', 'security', '');
    expect(ids).toEqual(['b']);
  });

  it('applies text search over title, category, and files', () => {
    const idx = buildIndex(items);
    const ids1 = filterIds(idx, items, 'all', 'all', 'sec');
    expect(ids1).toEqual(['b']);
    const ids2 = filterIds(idx, items, 'all', 'all', 'a.ts');
    expect(ids2).toEqual(['a']);
  });
});

