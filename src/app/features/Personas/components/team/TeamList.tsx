'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Trash2, ChevronRight } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';

export default function TeamList() {
  const teams = usePersonaStore((s) => s.teams);
  const fetchTeams = usePersonaStore((s) => s.fetchTeams);
  const createTeam = usePersonaStore((s) => s.createTeam);
  const deleteTeam = usePersonaStore((s) => s.deleteTeam);
  const selectTeam = usePersonaStore((s) => s.selectTeam);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createTeam({ name: newName.trim(), description: newDescription.trim() || undefined, color: newColor });
    setNewName('');
    setNewDescription('');
    setNewColor('#6366f1');
    setShowCreate(false);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground/90">Agent Teams</h1>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Design multi-agent pipelines with visual canvas
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 transition-all group"
          >
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">New Team</span>
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 rounded-2xl bg-secondary/40 backdrop-blur-sm border border-indigo-500/20"
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-muted-foreground/50 uppercase tracking-wider mb-1.5 block">Team Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Code Review Pipeline"
                  className="w-full px-3 py-2 rounded-lg bg-background/60 border border-primary/15 text-sm text-foreground/90 placeholder:text-muted-foreground/30 focus:outline-none focus:border-indigo-500/40"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground/50 uppercase tracking-wider mb-1.5 block">Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 rounded-lg bg-background/60 border border-primary/15 text-sm text-foreground/90 placeholder:text-muted-foreground/30 focus:outline-none focus:border-indigo-500/40"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground/50 uppercase tracking-wider mb-1.5 block">Color</label>
                <div className="flex gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={`w-7 h-7 rounded-lg transition-all ${newColor === c ? 'ring-2 ring-offset-2 ring-offset-background scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-1.5 text-sm text-muted-foreground/60 hover:text-foreground/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="px-4 py-1.5 text-sm font-medium rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Create Team
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Team Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team: any, i: number) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              className="group relative p-5 rounded-2xl bg-secondary/40 backdrop-blur-sm border border-primary/15 hover:border-indigo-500/30 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.08)]"
              onClick={() => selectTeam(team.id)}
            >
              {/* Color accent bar */}
              <div
                className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-60"
                style={{ backgroundColor: team.color || '#6366f1' }}
              />

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border"
                    style={{
                      backgroundColor: (team.color || '#6366f1') + '15',
                      borderColor: (team.color || '#6366f1') + '30',
                    }}
                  >
                    {team.icon ? (
                      <span className="text-lg">{team.icon}</span>
                    ) : (
                      <Users className="w-5 h-5" style={{ color: (team.color || '#6366f1') + 'cc' }} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground/90 group-hover:text-foreground transition-colors">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="text-xs text-muted-foreground/50 mt-0.5 line-clamp-1">{team.description}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete team "${team.name}"?`)) deleteTeam(team.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/15 text-muted-foreground/40 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full ${team.enabled !== 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20'}`}>
                    {team.enabled !== 0 ? 'active' : 'draft'}
                  </span>
                  <span className="text-[11px] text-muted-foreground/40 font-mono">
                    {team.member_count || 0} agents
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-indigo-400/60 group-hover:translate-x-0.5 transition-all" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {teams.length === 0 && !showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Users className="w-8 h-8 text-indigo-400/50" />
            </div>
            <h2 className="text-lg font-semibold text-foreground/70 mb-1">No teams yet</h2>
            <p className="text-sm text-muted-foreground/50 mb-6 max-w-sm mx-auto">
              Create a team to connect multiple agents into automated pipelines
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Create First Team</span>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
