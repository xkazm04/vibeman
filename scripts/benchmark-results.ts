import { buildIndex, filterIds } from '../src/app/features/RefactorWizard/results/ResultsIndex';
import type { RefactorOpportunity } from '../src/stores/refactorStore';

function gen(n: number): RefactorOpportunity[] {
  const cats = ['performance','maintainability','security','code-quality','duplication','architecture'] as const;
  const sevs = ['low','medium','high','critical'] as const;
  const out: RefactorOpportunity[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: `id-${i}`,
      title: `Item ${i}`,
      description: '',
      category: cats[i % cats.length],
      severity: sevs[i % sevs.length],
      impact: '',
      effort: 'low',
      files: [`/src/${i % 100}.ts`],
      autoFixAvailable: i % 10 === 0,
    });
  }
  return out;
}

const N = 100_000;
const items = gen(N);

console.time('buildIndex');
const idx = buildIndex(items);
console.timeEnd('buildIndex');

console.time('filterIds-sev-cat');
const ids1 = filterIds(idx, items, 'high', 'performance', '');
console.timeEnd('filterIds-sev-cat');

console.time('filterIds-search');
const ids2 = filterIds(idx, items, 'all', 'all', 'src/5');
console.timeEnd('filterIds-search');

console.log('Results', { counts: { ids1: ids1.length, ids2: ids2.length } });
