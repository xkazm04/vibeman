'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, ArrowRight, Ban, Zap, ChevronDown, Plus, X, Loader2 } from 'lucide-react';

interface DependencyWithTitle {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: 'blocks' | 'enables' | 'conflicts_with';
  source_title: string;
  target_title: string;
  source_status: string;
  target_status: string;
}

interface RelatedIdea {
  id: string;
  title: string;
  category: string;
  status: string;
}

interface IdeaDependencySectionProps {
  ideaId: string;
}

const RELATIONSHIP_CONFIG = {
  blocks: { label: 'Blocks', icon: Ban, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  enables: { label: 'Enables', icon: Zap, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  conflicts_with: { label: 'Conflicts', icon: Ban, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
} as const;

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300',
  accepted: 'bg-green-500/20 text-green-300',
  rejected: 'bg-red-500/20 text-red-300',
  implemented: 'bg-blue-500/20 text-blue-300',
};

export default function IdeaDependencySection({ ideaId }: IdeaDependencySectionProps) {
  const [dependencies, setDependencies] = useState<DependencyWithTitle[]>([]);
  const [related, setRelated] = useState<RelatedIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [addingType, setAddingType] = useState<'blocks' | 'enables' | 'conflicts_with'>('enables');
  const [selectedRelatedId, setSelectedRelatedId] = useState<string | null>(null);

  const loadDependencies = useCallback(async () => {
    try {
      const res = await fetch(`/api/ideas/dependencies?ideaId=${ideaId}`);
      const data = await res.json();
      if (data.success) {
        setDependencies(data.dependencies || []);
      }
    } catch {
      // Silently fail — this is a supplementary section
    }
  }, [ideaId]);

  const loadRelated = useCallback(async () => {
    try {
      const res = await fetch(`/api/ideas/dependencies?ideaId=${ideaId}&discover=true`);
      const data = await res.json();
      if (data.success) {
        setRelated(data.related || []);
      }
    } catch {
      // Silently fail
    }
  }, [ideaId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadDependencies(), loadRelated()]).finally(() => setLoading(false));
  }, [loadDependencies, loadRelated]);

  const handleAddDependency = async () => {
    if (!selectedRelatedId) return;

    try {
      const res = await fetch('/api/ideas/dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: ideaId,
          targetId: selectedRelatedId,
          relationshipType: addingType,
        }),
      });

      if (res.ok) {
        await loadDependencies();
        setShowAddForm(false);
        setSelectedRelatedId(null);
      }
    } catch {
      // Handle silently
    }
  };

  const handleRemoveDependency = async (depId: string) => {
    try {
      await fetch(`/api/ideas/dependencies?id=${depId}`, { method: 'DELETE' });
      setDependencies(prev => prev.filter(d => d.id !== depId));
    } catch {
      // Handle silently
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-xs py-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Loading dependencies...</span>
      </div>
    );
  }

  const totalLinks = dependencies.length + related.length;
  if (totalLinks === 0 && !showAddForm) return null;

  // Categorize dependencies relative to this idea
  const outgoing = dependencies.filter(d => d.source_id === ideaId);
  const incoming = dependencies.filter(d => d.target_id === ideaId);

  // Filter out already-linked ideas from the related suggestions
  const linkedIds = new Set(dependencies.map(d =>
    d.source_id === ideaId ? d.target_id : d.source_id
  ));
  const unlinkedRelated = related.filter(r => !linkedIds.has(r.id));

  return (
    <div className="space-y-2">
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <Link2 className="w-3.5 h-3.5 text-cyan-400" />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Related Ideas
        </h3>
        {dependencies.length > 0 && (
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 rounded-full">
            {dependencies.length}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-gray-500 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {/* Existing Dependencies */}
            {outgoing.map(dep => {
              const config = RELATIONSHIP_CONFIG[dep.relationship_type];
              const Icon = config.icon;
              return (
                <div key={dep.id} className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs ${config.bg}`}>
                  <Icon className={`w-3 h-3 ${config.color} flex-shrink-0`} />
                  <span className={`${config.color} font-medium flex-shrink-0`}>{config.label}</span>
                  <ArrowRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-200 truncate flex-1">{dep.target_title}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${STATUS_BADGE[dep.target_status] || ''}`}>
                    {dep.target_status}
                  </span>
                  <button
                    onClick={() => handleRemoveDependency(dep.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {incoming.map(dep => {
              const config = RELATIONSHIP_CONFIG[dep.relationship_type];
              const Icon = config.icon;
              return (
                <div key={dep.id} className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs ${config.bg}`}>
                  <span className="text-gray-200 truncate flex-1">{dep.source_title}</span>
                  <ArrowRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
                  <Icon className={`w-3 h-3 ${config.color} flex-shrink-0`} />
                  <span className={`${config.color} font-medium flex-shrink-0`}>{config.label}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${STATUS_BADGE[dep.source_status] || ''}`}>
                    {dep.source_status}
                  </span>
                  <button
                    onClick={() => handleRemoveDependency(dep.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* Discovered Related Ideas (unlinked) */}
            {unlinkedRelated.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] text-gray-500 mb-1">Suggested (same context/category):</p>
                {unlinkedRelated.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center gap-2 px-2 py-1 rounded text-xs text-gray-400 hover:bg-gray-700/30 transition-colors">
                    <span className="truncate flex-1">{r.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${STATUS_BADGE[r.status] || ''}`}>
                      {r.status}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedRelatedId(r.id);
                        setShowAddForm(true);
                      }}
                      className="text-gray-500 hover:text-cyan-400 transition-colors"
                      title="Link this idea"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Dependency Form */}
            {showAddForm && selectedRelatedId && (
              <div className="flex items-center gap-2 pt-1 border-t border-gray-700/30">
                <select
                  value={addingType}
                  onChange={e => setAddingType(e.target.value as typeof addingType)}
                  className="bg-gray-700 border border-gray-600 rounded text-xs text-gray-200 px-2 py-1"
                >
                  <option value="enables">Enables</option>
                  <option value="blocks">Blocks</option>
                  <option value="conflicts_with">Conflicts with</option>
                </select>
                <button
                  onClick={handleAddDependency}
                  className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-xs hover:bg-cyan-500/30 transition-colors"
                >
                  Link
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setSelectedRelatedId(null); }}
                  className="px-2 py-1 text-gray-400 text-xs hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Add Button */}
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-cyan-400 transition-colors pt-1"
              >
                <Plus className="w-3 h-3" />
                Add dependency
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
