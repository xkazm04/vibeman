import { describe, it, expect } from 'vitest';
import { auditContexts, type AuditContextInput } from './audit';

const ctx = (over: Partial<AuditContextInput>): AuditContextInput => ({
  id: 'c1',
  name: 'Ctx',
  groupId: 'g1',
  filePaths: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'],
  category: 'lib',
  ...over,
});

describe('auditContexts referential integrity', () => {
  it('flags a crossRef pointing at a non-existent context', () => {
    const a = ctx({ id: 'a', name: 'Alpha', crossRefs: [{ contextId: 'b', relationship: 'depends_on' }, { contextId: 'ghost' }] });
    const b = ctx({ id: 'b', name: 'Beta', crossRefs: [] });
    const r = auditContexts([a, b], [{ id: 'g1', name: 'G', domain: 'feature' }]);
    expect(r.findings.some((f) => f.code === 'unresolved_cross_ref')).toBe(true);
    expect(r.totals.unresolvedCrossRefs).toBe(1); // only 'ghost' is unresolved
  });

  it('does not flag when all crossRefs resolve', () => {
    const a = ctx({ id: 'a', name: 'Alpha', crossRefs: [{ contextId: 'b' }] });
    const b = ctx({ id: 'b', name: 'Beta' });
    const r = auditContexts([a, b], [{ id: 'g1', name: 'G', domain: 'feature' }]);
    expect(r.findings.some((f) => f.code === 'unresolved_cross_ref')).toBe(false);
    expect(r.totals.unresolvedCrossRefs).toBe(0);
  });

  it('flags dangling files via the fileExists resolver', () => {
    const a = ctx({ id: 'a', name: 'Alpha', filePaths: ['live.ts', 'gone.ts'] });
    const r = auditContexts([a], [{ id: 'g1', name: 'G', domain: 'feature' }], {
      fileExists: (f) => f === 'live.ts',
    });
    expect(r.findings.some((f) => f.code === 'missing_files')).toBe(true);
    expect(r.totals.missingFiles).toBe(1);
  });

  it('flags content drift via the isStale resolver', () => {
    const a = ctx({ id: 'a', name: 'Alpha', filePaths: ['x.ts', 'y.ts'] });
    const r = auditContexts([a], [{ id: 'g1', name: 'G', domain: 'feature' }], {
      isStale: (f) => f === 'y.ts',
    });
    expect(r.findings.some((f) => f.code === 'content_stale')).toBe(true);
    expect(r.totals.contentStaleContexts).toBe(1);
  });

  it('does not flag content drift when nothing changed', () => {
    const a = ctx({ id: 'a', name: 'Alpha' });
    const r = auditContexts([a], [{ id: 'g1', name: 'G', domain: 'feature' }], {
      isStale: () => false,
    });
    expect(r.findings.some((f) => f.code === 'content_stale')).toBe(false);
    expect(r.totals.contentStaleContexts).toBe(0);
  });
});
