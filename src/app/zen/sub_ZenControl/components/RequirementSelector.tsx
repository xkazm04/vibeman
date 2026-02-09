'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Square,
  Folder,
  ChevronDown,
  FileText,
  Lightbulb,
  Compass,
  Sparkles,
} from 'lucide-react';
import type { RemoteRequirement } from '@/stores/remoteWorkStore';

interface RequirementSelectorProps {
  requirements: RemoteRequirement[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

const sourceIcons = {
  direction: Compass,
  idea: Lightbulb,
  manual: FileText,
};

const sourceColors = {
  direction: 'text-purple-400',
  idea: 'text-amber-400',
  manual: 'text-gray-400',
};

export default function RequirementSelector({
  requirements,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
}: RequirementSelectorProps) {
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Get unique projects
  const projects = useMemo(() => {
    const uniqueProjects = new Map<string, string>();
    requirements.forEach(r => {
      if (!uniqueProjects.has(r.project_id)) {
        uniqueProjects.set(r.project_id, r.project_name || r.project_id);
      }
    });
    return Array.from(uniqueProjects.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [requirements]);

  // Filter requirements by project
  const filteredRequirements = useMemo(() => {
    if (!projectFilter) return requirements;
    return requirements.filter(r => r.project_id === projectFilter);
  }, [requirements, projectFilter]);

  // Selection state
  const allSelected = filteredRequirements.length > 0 &&
    filteredRequirements.every(r => selectedIds.includes(r.id));
  const someSelected = filteredRequirements.some(r => selectedIds.includes(r.id));

  const handleToggleAll = () => {
    if (allSelected) {
      onClearAll();
    } else {
      onSelectAll();
    }
  };

  if (requirements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="w-8 h-8 text-gray-600 mb-2" />
        <p className="text-sm text-gray-400">No requirements found</p>
        <p className="text-xs text-gray-500 mt-1">
          Requirements are created when directions are accepted
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with project filter */}
      <div className="flex items-center justify-between">
        {/* Project filter dropdown */}
        {projects.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded transition-colors"
            >
              <Folder className="w-3 h-3 text-gray-400" />
              <span className="text-gray-300">
                {projectFilter
                  ? projects.find(p => p.id === projectFilter)?.name || 'Unknown'
                  : 'All Projects'}
              </span>
              <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setProjectFilter(null);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-700/50 transition-colors ${!projectFilter ? 'bg-gray-700/30 text-cyan-400' : 'text-gray-300'}`}
                  >
                    All Projects
                  </button>
                  {projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setProjectFilter(project.id);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-700/50 transition-colors truncate ${projectFilter === project.id ? 'bg-gray-700/30 text-cyan-400' : 'text-gray-300'}`}
                    >
                      {project.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Select all toggle */}
        <button
          onClick={handleToggleAll}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          {allSelected ? (
            <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
          ) : someSelected ? (
            <Square className="w-3.5 h-3.5 text-cyan-400/50" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
          <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
        </button>
      </div>

      {/* Requirements list */}
      <div className="max-h-[250px] overflow-y-auto space-y-1 pr-1">
        {filteredRequirements.map(req => {
          const isSelected = selectedIds.includes(req.id);
          const SourceIcon = sourceIcons[req.source || 'manual'];
          const sourceColor = sourceColors[req.source || 'manual'];

          return (
            <motion.button
              key={req.id}
              onClick={() => onToggle(req.id)}
              className={`
                w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all
                ${isSelected
                  ? 'bg-cyan-500/10 border border-cyan-500/30'
                  : 'bg-gray-800/30 border border-gray-700/30 hover:bg-gray-800/50'
                }
              `}
              whileTap={{ scale: 0.98 }}
            >
              {/* Checkbox */}
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-gray-600 shrink-0" />
              )}

              {/* Source icon */}
              <SourceIcon className={`w-3.5 h-3.5 ${sourceColor} shrink-0`} />

              {/* Name */}
              <span className={`flex-1 text-xs truncate ${isSelected ? 'text-cyan-100' : 'text-gray-300'}`}>
                {req.name}
              </span>

              {/* Date */}
              <span className="text-[10px] text-gray-600 shrink-0">
                {formatRelativeDate(req.created_at)}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Selection count */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
        <span className="text-xs text-gray-500">
          {selectedIds.length} of {filteredRequirements.length} selected
        </span>
        <div className="flex items-center gap-2 text-[10px] text-gray-600">
          <span className="flex items-center gap-1">
            <Compass className="w-3 h-3 text-purple-400" /> direction
          </span>
          <span className="flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-400" /> idea
          </span>
        </div>
      </div>
    </div>
  );
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'now';
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}
