import type { RefactorOpportunity } from '@/stores/refactorStore';
import { buildIndex, filterIds, itemsById } from './ResultsIndex';

export class ResultsController {
  private items: RefactorOpportunity[] = [];
  private index = buildIndex([]);
  private map = new Map<string, RefactorOpportunity>();

  setAll(items: RefactorOpportunity[]): void {
    this.items = items;
    this.index = buildIndex(items);
    this.map = itemsById(items);
  }

  appendChunk(chunk: RefactorOpportunity[]): void {
    if (chunk.length === 0) return;
    this.items = this.items.concat(chunk);
    this.index = buildIndex(this.items);
    for (const o of chunk) this.map.set(o.id, o);
  }

  getFilteredIds(
    severity: RefactorOpportunity['severity'] | 'all',
    category: RefactorOpportunity['category'] | 'all',
    search: string
  ): string[] {
    return filterIds(this.index, this.items, severity, category, search);
  }

  getByIds(ids: string[]): RefactorOpportunity[] {
    return ids.map(id => this.map.get(id)).filter(Boolean) as RefactorOpportunity[];
  }
}

