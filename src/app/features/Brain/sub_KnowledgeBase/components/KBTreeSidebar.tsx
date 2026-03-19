'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Folder, FileText } from 'lucide-react';
import type { KBTree, TreeSelection } from '../lib/useKnowledgeBase';
import { KNOWLEDGE_LAYER_LABELS, KNOWLEDGE_CATEGORY_LABELS } from '@/app/db/models/knowledge.types';
import type { KnowledgeLayer, KnowledgeCategory, KnowledgeLanguage } from '@/app/db/models/knowledge.types';

interface KBTreeSidebarProps {
  tree: KBTree | null;
  selection: TreeSelection;
  onSelect: (sel: TreeSelection) => void;
}

export default function KBTreeSidebar({ tree, selection, onSelect }: KBTreeSidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const languages = useMemo(() => {
    if (!tree) return [];
    return Object.entries(tree)
      .map(([lang, layers]) => {
        const total = Object.values(layers).reduce(
          (sum, cats) => sum + Object.values(cats).reduce((s, c) => s + c, 0), 0
        );
        return { lang, layers, total };
      })
      .sort((a, b) => b.total - a.total);
  }, [tree]);

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isSelected = (lang?: string, layer?: string, cat?: string) => {
    return selection.language === lang && selection.layer === layer && selection.category === cat;
  };

  const handleSelectAll = () => {
    onSelect({});
  };

  const handleSelectLang = (lang: string) => {
    if (isSelected(lang, undefined, undefined)) {
      onSelect({});
    } else {
      onSelect({ language: lang as KnowledgeLanguage });
      if (!expanded.has(lang)) toggle(lang);
    }
  };

  const handleSelectLayer = (lang: string, layer: string) => {
    if (isSelected(lang, layer, undefined)) {
      onSelect({ language: lang as KnowledgeLanguage });
    } else {
      onSelect({ language: lang as KnowledgeLanguage, layer: layer as KnowledgeLayer });
      const key = `${lang}/${layer}`;
      if (!expanded.has(key)) toggle(key);
    }
  };

  const handleSelectCat = (lang: string, layer: string, cat: string) => {
    if (isSelected(lang, layer, cat)) {
      onSelect({ language: lang as KnowledgeLanguage, layer: layer as KnowledgeLayer });
    } else {
      onSelect({ language: lang as KnowledgeLanguage, layer: layer as KnowledgeLayer, category: cat as KnowledgeCategory });
    }
  };

  const totalEntries = languages.reduce((sum, l) => sum + l.total, 0);

  return (
    <div className="w-56 flex-shrink-0 overflow-y-auto border-r border-zinc-800/50 bg-zinc-950/30">
      <div className="p-3">
        <h3 className="text-2xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Browse</h3>

        {/* All entries root */}
        <button
          onClick={handleSelectAll}
          className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors mb-1 ${
            !selection.language ? 'bg-purple-500/15 text-purple-300' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">All Entries</span>
          <span className="ml-auto text-2xs text-zinc-600 tabular-nums">{totalEntries}</span>
        </button>

        {/* Language nodes */}
        {languages.map(({ lang, layers, total }) => {
          const langExpanded = expanded.has(lang);
          const langSelected = selection.language === lang && !selection.layer;
          const layerEntries = Object.entries(layers).sort(([, a], [, b]) => {
            const sumA = Object.values(a).reduce((s, c) => s + c, 0);
            const sumB = Object.values(b).reduce((s, c) => s + c, 0);
            return sumB - sumA;
          });

          return (
            <div key={lang}>
              {/* Language row */}
              <div className="flex items-center">
                <button
                  onClick={() => toggle(lang)}
                  className="p-0.5 text-zinc-600 hover:text-zinc-400"
                >
                  {langExpanded
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronRight className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => handleSelectLang(lang)}
                  className={`flex-1 flex items-center gap-1.5 px-1.5 py-1 rounded text-xs transition-colors ${
                    langSelected ? 'bg-purple-500/15 text-purple-300' : 'text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/50'
                  }`}
                >
                  {langExpanded
                    ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500" />
                    : <Folder className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500" />}
                  <span className="truncate">{lang}</span>
                  <span className="ml-auto text-2xs text-zinc-600 tabular-nums">{total}</span>
                </button>
              </div>

              {/* Layer children */}
              {langExpanded && (
                <div className="ml-3.5">
                  {layerEntries.map(([layer, cats]) => {
                    const layerKey = `${lang}/${layer}`;
                    const layerExp = expanded.has(layerKey);
                    const layerSel = selection.language === lang && selection.layer === layer && !selection.category;
                    const layerTotal = Object.values(cats).reduce((s, c) => s + c, 0);
                    const catEntries = Object.entries(cats).sort(([, a], [, b]) => b - a);

                    return (
                      <div key={layer}>
                        <div className="flex items-center">
                          <button
                            onClick={() => toggle(layerKey)}
                            className="p-0.5 text-zinc-600 hover:text-zinc-400"
                          >
                            {layerExp
                              ? <ChevronDown className="w-3 h-3" />
                              : <ChevronRight className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => handleSelectLayer(lang, layer)}
                            className={`flex-1 flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs transition-colors ${
                              layerSel ? 'bg-purple-500/15 text-purple-300' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                            }`}
                          >
                            {layerExp
                              ? <FolderOpen className="w-3 h-3 flex-shrink-0 text-zinc-600" />
                              : <Folder className="w-3 h-3 flex-shrink-0 text-zinc-600" />}
                            <span className="truncate">{KNOWLEDGE_LAYER_LABELS[layer as KnowledgeLayer] ?? layer}</span>
                            <span className="ml-auto text-2xs text-zinc-600 tabular-nums">{layerTotal}</span>
                          </button>
                        </div>

                        {/* Category children */}
                        {layerExp && (
                          <div className="ml-4">
                            {catEntries.map(([cat, count]) => {
                              const catSel = selection.language === lang && selection.layer === layer && selection.category === cat;
                              return (
                                <button
                                  key={cat}
                                  onClick={() => handleSelectCat(lang, layer, cat)}
                                  className={`w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs transition-colors ${
                                    catSel ? 'bg-purple-500/15 text-purple-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                  }`}
                                >
                                  <FileText className="w-3 h-3 flex-shrink-0 text-zinc-600" />
                                  <span className="truncate">{KNOWLEDGE_CATEGORY_LABELS[cat as KnowledgeCategory] ?? cat}</span>
                                  <span className="ml-auto text-2xs text-zinc-600 tabular-nums">{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {languages.length === 0 && (
          <p className="text-2xs text-zinc-600 px-2 py-4">No entries yet</p>
        )}
      </div>
    </div>
  );
}
