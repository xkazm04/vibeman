'use client';

/**
 * KnowledgeBasePanel — human browse/search UI over the knowledge base that was
 * previously reachable only by agents via MCP. Lists reusable patterns agents
 * have accumulated, with text search.
 *
 * Backed by GET /api/knowledge-base (action=list / ?search=).
 */

import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, BookOpen, Tag } from 'lucide-react';

interface KnowledgeEntry {
  id: string;
  domain: string;
  title: string;
  pattern: string;
  rationale?: string | null;
  confidence?: number;
  tags?: string[] | string | null;
  language?: string | null;
  pattern_type?: string;
}

function parseTags(tags: KnowledgeEntry['tags']): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(tags).split(',').map((t) => t.trim()).filter(Boolean);
  }
}

export default function KnowledgeBasePanel() {
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const qs = term.trim()
        ? `?search=${encodeURIComponent(term.trim())}&limit=50`
        : `?action=list&limit=50`;
      const res = await fetch(`/api/knowledge-base${qs}`);
      if (res.ok) {
        const json = await res.json();
        setEntries(Array.isArray(json.data) ? json.data : []);
      }
    } catch {
      // Non-critical.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(''); }, [load]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-700/50">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search knowledge…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void load(search); }}
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-800/60 border border-gray-700/50 rounded text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
          />
        </div>
        <div className="mt-1.5 text-[10px] text-gray-500 font-mono">{entries.length} entries</div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 text-xs p-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center text-center text-gray-600 py-10 px-3">
            <BookOpen className="w-7 h-7 mb-2 text-gray-700" />
            <p className="text-xs">
              No knowledge entries yet. Reusable patterns agents learn while working land here.
            </p>
          </div>
        ) : (
          entries.map((e) => {
            const tags = parseTags(e.tags);
            return (
              <div key={e.id} className="rounded-lg bg-gray-800/40 border border-gray-700/40 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] uppercase tracking-wide text-cyan-400/80 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                    {e.domain}
                  </span>
                  {typeof e.confidence === 'number' && (
                    <span className="text-[9px] text-gray-500 ml-auto">{Math.round(e.confidence)}% conf</span>
                  )}
                </div>
                <div className="text-xs text-gray-200 font-medium">{e.title}</div>
                {e.rationale && (
                  <div className="text-[11px] text-gray-500 mt-1 line-clamp-2">{e.rationale}</div>
                )}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {tags.slice(0, 4).map((t) => (
                      <span key={t} className="text-[9px] text-gray-500 flex items-center gap-0.5">
                        <Tag className="w-2.5 h-2.5" />{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
