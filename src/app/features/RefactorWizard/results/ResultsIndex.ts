import type { RefactorOpportunity } from '@/stores/refactorStore';
import type { ResultsIndex, ResultId } from './types';

export function buildIndex(items: RefactorOpportunity[]): ResultsIndex {
  const bySeverity = new Map<RefactorOpportunity['severity'], ResultId[]>();
  const byCategory = new Map<RefactorOpportunity['category'], ResultId[]>();
  const byFile = new Map<string, ResultId[]>();

  for (const o of items) {
    push(bySeverity, o.severity, o.id);
    push(byCategory, o.category, o.id);
    for (const f of o.files) push(byFile, f, o.id);
  }

  return { bySeverity, byCategory, byFile };
}

export function filterIds(
  index: ResultsIndex,
  items: RefactorOpportunity[],
  severity: RefactorOpportunity['severity'] | 'all',
  category: RefactorOpportunity['category'] | 'all',
  search: string
): ResultId[] {
  const baseIds = new Set<string>(items.map(i => i.id));
  let ids: Set<string> = baseIds;

  if (severity !== 'all') ids = intersect(ids, new Set(index.bySeverity.get(severity) || []));
  if (category !== 'all') ids = intersect(ids, new Set(index.byCategory.get(category) || []));

  if (search) {
    const s = search.toLowerCase();
    ids = new Set(Array.from(ids).filter(id => {
      const o = itemsById(items).get(id);
      if (!o) return false;
      const hay = `${o.title} ${o.category} ${o.files.join(' ')}`.toLowerCase();
      return hay.includes(s);
    }));
  }

  return Array.from(ids);
}

export function itemsById(items: RefactorOpportunity[]): Map<string, RefactorOpportunity> {
  const m = new Map<string, RefactorOpportunity>();
  for (const o of items) m.set(o.id, o);
  return m;
}

function push<K>(map: Map<K, string[]>, key: K, id: string): void {
  const arr = map.get(key);
  if (arr) arr.push(id); else map.set(key, [id]);
}

function intersect(a: Set<string>, b: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const v of a) if (b.has(v)) out.add(v);
  return out;
}

