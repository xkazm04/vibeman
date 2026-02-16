'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { DndContext, DragOverlay, closestCenter, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, LayoutGrid, FolderPlus, Trash2, Pencil, X, Check } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import PersonaCard from './PersonaCard';
import type { DbPersona, DbPersonaGroup } from '@/app/features/Personas/lib/types';

// ── Color palette for groups ──────────────────────────────────────
const GROUP_COLORS = [
  '#6B7280', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#06B6D4', '#6366F1', '#F97316',
];

// ── Draggable PersonaCard wrapper ────────────────────────────────
function DraggablePersonaCard({
  persona,
  isSelected,
  onClick,
}: {
  persona: DbPersona;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: persona.id,
    data: { type: 'persona', persona },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-30' : ''}
    >
      <PersonaCard persona={persona} isSelected={isSelected} onClick={onClick} />
    </div>
  );
}

// ── Droppable group container ────────────────────────────────────
function DroppableGroup({
  group,
  personas,
  selectedPersonaId,
  onSelectPersona,
  onToggleCollapse,
  onRename,
  onDelete,
  isDragActive,
}: {
  group: DbPersonaGroup;
  personas: DbPersona[];
  selectedPersonaId: string | null;
  onSelectPersona: (id: string) => void;
  onToggleCollapse: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  isDragActive: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `group:${group.id}`,
    data: { type: 'group', groupId: group.id },
  });
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCollapsed = group.collapsed === 1;

  const handleStartRename = () => {
    setRenameValue(group.name);
    setIsRenaming(true);
    setShowMenu(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleConfirmRename = () => {
    if (renameValue.trim() && renameValue.trim() !== group.name) {
      onRename(renameValue.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border transition-all mb-2 ${
        isOver && isDragActive
          ? 'border-primary/40 bg-primary/5 shadow-[0_0_12px_rgba(59,130,246,0.1)]'
          : 'border-primary/10 bg-secondary/20'
      }`}
    >
      {/* Group header */}
      <div className="flex items-center gap-2 px-2.5 py-2 cursor-pointer select-none" onClick={onToggleCollapse}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
        {isRenaming ? (
          <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmRename(); if (e.key === 'Escape') setIsRenaming(false); }}
              className="flex-1 min-w-0 text-xs font-medium bg-transparent border-b border-primary/40 outline-none text-foreground/90 py-0.5"
            />
            <button onClick={handleConfirmRename} className="p-0.5 hover:bg-secondary/60 rounded">
              <Check className="w-3 h-3 text-emerald-400" />
            </button>
            <button onClick={() => setIsRenaming(false)} className="p-0.5 hover:bg-secondary/60 rounded">
              <X className="w-3 h-3 text-muted-foreground/50" />
            </button>
          </div>
        ) : (
          <span className="text-xs font-medium text-foreground/70 truncate flex-1">{group.name}</span>
        )}
        <span className="text-[10px] font-mono text-muted-foreground/40">{personas.length}</span>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-0.5 rounded hover:bg-secondary/60 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-6 z-50 w-28 py-1 bg-background border border-primary/20 rounded-lg shadow-lg">
              <button
                onClick={handleStartRename}
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-secondary/60 flex items-center gap-2 text-foreground/70"
              >
                <Pencil className="w-3 h-3" /> Rename
              </button>
              <button
                onClick={() => { onDelete(); setShowMenu(false); }}
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-red-500/10 flex items-center gap-2 text-red-400"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        </div>
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
        )}
      </div>

      {/* Persona list (collapsible) */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-1.5 pb-1.5">
              {personas.length === 0 && (
                <div className="text-center py-3 text-[11px] text-muted-foreground/30">
                  Drop agents here
                </div>
              )}
              {personas.map((persona) => (
                <DraggablePersonaCard
                  key={persona.id}
                  persona={persona}
                  isSelected={selectedPersonaId === persona.id}
                  onClick={() => onSelectPersona(persona.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main GroupedAgentSidebar ─────────────────────────────────────
interface GroupedAgentSidebarProps {
  onCreatePersona: () => void;
}

export default function GroupedAgentSidebar({ onCreatePersona }: GroupedAgentSidebarProps) {
  const personas = usePersonaStore((s) => s.personas);
  const groups = usePersonaStore((s) => s.groups);
  const selectedPersonaId = usePersonaStore((s) => s.selectedPersonaId);
  const selectPersona = usePersonaStore((s) => s.selectPersona);
  const createGroup = usePersonaStore((s) => s.createGroup);
  const updateGroup = usePersonaStore((s) => s.updateGroup);
  const deleteGroup = usePersonaStore((s) => s.deleteGroup);
  const movePersonaToGroup = usePersonaStore((s) => s.movePersonaToGroup);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const newGroupInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Group personas
  const grouped = useMemo(() => {
    const map = new Map<string | null, DbPersona[]>();
    map.set(null, []); // ungrouped
    for (const g of groups) map.set(g.id, []);
    for (const p of personas) {
      const key = p.group_id || null;
      if (!map.has(key)) map.set(null, [...(map.get(null) || []), p]);
      else map.get(key)!.push(p);
    }
    return map;
  }, [personas, groups]);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => a.sort_order - b.sort_order);
  }, [groups]);

  const ungrouped = grouped.get(null) || [];

  const activePersona = activeId ? personas.find(p => p.id === activeId) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const personaId = String(active.id);
    const overId = String(over.id);

    let targetGroupId: string | null = null;
    if (overId === 'ungrouped') {
      targetGroupId = null;
    } else if (overId.startsWith('group:')) {
      targetGroupId = overId.replace('group:', '');
    } else {
      // Dropped on another persona - find that persona's group
      const targetPersona = personas.find(p => p.id === overId);
      targetGroupId = targetPersona?.group_id || null;
    }

    const currentPersona = personas.find(p => p.id === personaId);
    if (currentPersona && (currentPersona.group_id || null) !== targetGroupId) {
      movePersonaToGroup(personaId, targetGroupId);
    }
  }, [personas, movePersonaToGroup]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    await createGroup({ name: newGroupName.trim(), color: GROUP_COLORS[groups.length % GROUP_COLORS.length] });
    setNewGroupName('');
    setShowNewGroup(false);
  };

  // Droppable for ungrouped section
  const UngroupedZone = () => {
    const { isOver, setNodeRef } = useDroppable({
      id: 'ungrouped',
      data: { type: 'ungrouped' },
    });

    return (
      <div
        ref={setNodeRef}
        className={`rounded-xl border transition-all ${
          isOver && activeId
            ? 'border-primary/30 bg-primary/5'
            : 'border-transparent'
        }`}
      >
        {ungrouped.length > 0 && (
          <div className="px-0.5 py-1">
            <div className="text-[10px] font-mono text-muted-foreground/30 uppercase tracking-wider px-2 mb-1">
              Ungrouped
            </div>
            {ungrouped.map((persona) => (
              <DraggablePersonaCard
                key={persona.id}
                persona={persona}
                isSelected={selectedPersonaId === persona.id}
                onClick={() => selectPersona(persona.id)}
              />
            ))}
          </div>
        )}
        {ungrouped.length === 0 && groups.length > 0 && activeId && (
          <div className="text-center py-3 text-[11px] text-muted-foreground/30 border border-dashed border-primary/15 rounded-lg">
            Drop here to ungroup
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* All Agents overview button */}
      <button
        onClick={() => selectPersona(null)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 mb-2 rounded-xl transition-all ${
          selectedPersonaId === null
            ? 'bg-primary/10 border border-primary/20'
            : 'hover:bg-secondary/50 border border-transparent'
        }`}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${
          selectedPersonaId === null
            ? 'bg-primary/15 border-primary/25'
            : 'bg-secondary/40 border-primary/15'
        }`}>
          <LayoutGrid className={`w-3.5 h-3.5 ${selectedPersonaId === null ? 'text-primary' : 'text-muted-foreground/50'}`} />
        </div>
        <span className={`text-sm font-medium ${selectedPersonaId === null ? 'text-foreground/90' : 'text-muted-foreground/60'}`}>
          All Agents
        </span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground/40">
          {personas.length}
        </span>
      </button>

      {/* Action buttons row */}
      <div className="flex gap-1.5 mb-3">
        <button
          onClick={onCreatePersona}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/30 hover:border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all group"
        >
          <Plus className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium text-primary/80 group-hover:text-primary">Agent</span>
        </button>
        <button
          onClick={() => { setShowNewGroup(true); setTimeout(() => newGroupInputRef.current?.focus(), 50); }}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-violet-500/30 hover:border-violet-500/50 bg-violet-500/5 hover:bg-violet-500/10 transition-all group"
        >
          <FolderPlus className="w-3.5 h-3.5 text-violet-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium text-violet-400/80 group-hover:text-violet-400">Group</span>
        </button>
      </div>

      {/* New group input */}
      <AnimatePresence>
        {showNewGroup && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-2"
          >
            <div className="flex items-center gap-1.5 p-2 rounded-xl border border-violet-500/25 bg-violet-500/5">
              <input
                ref={newGroupInputRef}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateGroup(); if (e.key === 'Escape') setShowNewGroup(false); }}
                placeholder="Group name..."
                className="flex-1 min-w-0 text-xs bg-transparent border-none outline-none text-foreground/90 placeholder:text-muted-foreground/30"
              />
              <button onClick={handleCreateGroup} className="p-1 rounded hover:bg-violet-500/15">
                <Check className="w-3.5 h-3.5 text-violet-400" />
              </button>
              <button onClick={() => setShowNewGroup(false)} className="p-1 rounded hover:bg-secondary/60">
                <X className="w-3.5 h-3.5 text-muted-foreground/50" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DnD Context wrapping groups + ungrouped */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Groups */}
        {sortedGroups.map((group) => (
          <DroppableGroup
            key={group.id}
            group={group}
            personas={grouped.get(group.id) || []}
            selectedPersonaId={selectedPersonaId}
            onSelectPersona={selectPersona}
            onToggleCollapse={() => updateGroup(group.id, { collapsed: group.collapsed === 1 ? 0 : 1 })}
            onRename={(name) => updateGroup(group.id, { name })}
            onDelete={() => deleteGroup(group.id)}
            isDragActive={!!activeId}
          />
        ))}

        {/* Ungrouped */}
        <UngroupedZone />

        {/* Drag overlay */}
        <DragOverlay>
          {activePersona && (
            <div className="opacity-80 pointer-events-none">
              <PersonaCard persona={activePersona} isSelected={false} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Empty state */}
      {personas.length === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground/50">
          No personas yet
        </div>
      )}
    </>
  );
}
