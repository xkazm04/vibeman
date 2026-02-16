'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, LayoutGrid, Save, ChevronDown } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';

interface TeamToolbarProps {
  teamName: string;
  onBack: () => void;
  onAutoLayout: () => void;
  onSave: () => void;
  onAddMember: (personaId: string) => void;
}

export default function TeamToolbar({ teamName, onBack, onAutoLayout, onSave, onAddMember }: TeamToolbarProps) {
  const personas = usePersonaStore((s) => s.personas);
  const teamMembers = usePersonaStore((s) => s.teamMembers);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter out personas already in the team
  const memberPersonaIds = new Set(teamMembers.map((m: any) => m.persona_id));
  const availablePersonas = personas.filter((p) => !memberPersonaIds.has(p.id));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/50 backdrop-blur-sm border-b border-primary/15">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground/60 hover:text-foreground/80 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-semibold text-foreground/90">{teamName}</h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Add Agent Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/20 text-xs font-medium transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Agent
            <ChevronDown className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-xl bg-background/95 backdrop-blur-md border border-primary/20 shadow-xl z-50 overflow-hidden">
              <div className="p-1.5 max-h-60 overflow-y-auto">
                {availablePersonas.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground/50">
                    All agents already added
                  </div>
                ) : (
                  availablePersonas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onAddMember(p.id);
                        setShowDropdown(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0"
                        style={{
                          backgroundColor: (p.color || '#6366f1') + '15',
                          borderColor: (p.color || '#6366f1') + '30',
                        }}
                      >
                        {p.icon?.startsWith('http') ? (
                          <img src={p.icon} alt="" className="w-4 h-4 rounded object-cover" />
                        ) : (
                          <span className="text-xs">{p.icon || '🤖'}</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-foreground/80 truncate">{p.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Auto Layout */}
        <button
          onClick={onAutoLayout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/60 border border-primary/15 text-muted-foreground/70 hover:text-foreground/80 hover:bg-secondary/80 text-xs font-medium transition-all"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Layout
        </button>

        {/* Save */}
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20 text-xs font-medium transition-all"
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </button>
      </div>
    </div>
  );
}
