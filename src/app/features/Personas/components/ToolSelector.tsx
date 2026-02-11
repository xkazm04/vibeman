'use client';

import { useState, useMemo } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import { Check, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function ToolSelector() {
  const selectedPersona = usePersonaStore((state) => state.selectedPersona);
  const toolDefinitions = usePersonaStore((state) => state.toolDefinitions);
  const credentials = usePersonaStore((state) => state.credentials);
  const assignTool = usePersonaStore((state) => state.assignTool);
  const removeTool = usePersonaStore((state) => state.removeTool);

  const credentialTypeSet = useMemo(() => {
    const set = new Set<string>();
    credentials.forEach(c => set.add(c.service_type));
    return set;
  }, [credentials]);

  const personaId = selectedPersona?.id || '';
  const assignedToolIds = selectedPersona?.tools?.map(t => t.id) || [];

  const categories = useMemo(() => {
    const cats = new Set<string>();
    toolDefinitions.forEach((tool) => {
      if (tool.category) cats.add(tool.category);
    });
    return ['All', ...Array.from(cats)];
  }, [toolDefinitions]);

  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredTools = useMemo(() => {
    if (selectedCategory === 'All') return toolDefinitions;
    return toolDefinitions.filter((tool) => tool.category === selectedCategory);
  }, [toolDefinitions, selectedCategory]);

  if (!selectedPersona) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground/40">
        No persona selected
      </div>
    );
  }

  const handleToggleTool = async (toolId: string, isAssigned: boolean) => {
    if (isAssigned) {
      await removeTool(personaId, toolId);
    } else {
      await assignTool(personaId, toolId);
    }
  };

  return (
    <div className="space-y-5">
      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedCategory === category
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-secondary/40 text-muted-foreground/60 hover:bg-secondary/60 hover:text-foreground/80 border border-primary/15'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {filteredTools.map((tool) => {
          const isAssigned = assignedToolIds.includes(tool.id);
          return (
            <motion.div
              key={tool.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleToggleTool(tool.id, isAssigned)}
              className={`p-3 rounded-2xl border cursor-pointer backdrop-blur-sm transition-all ${
                isAssigned
                  ? 'bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.08)]'
                  : 'bg-secondary/40 border-primary/15 hover:border-primary/20'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 transition-colors ${
                    isAssigned
                      ? 'bg-primary border-primary'
                      : 'bg-background/50 border-primary/15'
                  }`}
                >
                  {isAssigned && <Check className="w-3 h-3 text-white" />}
                </div>

                {/* Tool Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-foreground text-sm truncate">
                      {tool.name}
                    </h4>
                    {tool.requires_credential_type && (
                      credentialTypeSet.has(tool.requires_credential_type) ? (
                        <span title="Credential available"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /></span>
                      ) : (
                        <span title="Needs credential"><AlertCircle className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" /></span>
                      )
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/50 mt-1.5 line-clamp-2">
                    {tool.description}
                  </p>
                  {tool.category && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[11px] font-mono bg-background/50 text-muted-foreground/40 border border-primary/15">
                      {tool.category}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-8 text-muted-foreground/40 text-sm">
          No tools found in this category
        </div>
      )}
    </div>
  );
}
