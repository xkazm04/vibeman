/**
 * Migration Timeline
 * Visual timeline of all applied database migrations with rollback support.
 * Reads from _migrations_applied and displays name, timestamp, affected tables.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Clock,
  Table2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Search,
  Layers,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatDate';

interface MigrationEntry {
  name: string;
  applied_at: string;
  affected_tables: string[];
}

interface RollbackResult {
  migration: string;
  ddl: string[];
  status: 'rolled_back' | 'skipped';
  reason?: string;
}

interface RollbackResponse {
  dryRun: boolean;
  count: number;
  results: RollbackResult[];
}

export default function MigrationTimeline() {
  const [migrations, setMigrations] = useState<MigrationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMigration, setExpandedMigration] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rollbackCount, setRollbackCount] = useState(1);
  const [rollbackPreview, setRollbackPreview] = useState<RollbackResponse | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [showRollbackPanel, setShowRollbackPanel] = useState(false);
  const [confirmRollback, setConfirmRollback] = useState(false);

  const fetchMigrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/migrations');
      if (!res.ok) throw new Error('Failed to fetch migrations');
      const data = await res.json();
      setMigrations(data.migrations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMigrations();
  }, [fetchMigrations]);

  const handleDryRun = async () => {
    try {
      setIsRollingBack(true);
      const res = await fetch('/api/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: rollbackCount, dryRun: true }),
      });
      if (!res.ok) throw new Error('Dry run failed');
      const data: RollbackResponse = await res.json();
      setRollbackPreview(data);
      setConfirmRollback(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dry run failed');
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleRollback = async () => {
    try {
      setIsRollingBack(true);
      const res = await fetch('/api/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: rollbackCount, dryRun: false }),
      });
      if (!res.ok) throw new Error('Rollback failed');
      setRollbackPreview(null);
      setConfirmRollback(false);
      setShowRollbackPanel(false);
      await fetchMigrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rollback failed');
    } finally {
      setIsRollingBack(false);
    }
  };

  const filtered = searchQuery
    ? migrations.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.affected_tables.some((t) =>
            t.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : migrations;

  // Group migrations by date
  const groupedByDate = filtered.reduce<Record<string, MigrationEntry[]>>(
    (acc, m) => {
      const date = m.applied_at?.split('T')[0] ?? m.applied_at?.split(' ')[0] ?? 'Unknown';
      if (!acc[date]) acc[date] = [];
      acc[date].push(m);
      return acc;
    },
    {}
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-400 font-mono">Loading migrations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
          <button
            onClick={fetchMigrations}
            className="text-xs text-cyan-400 hover:text-cyan-300 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <Database className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Migration Timeline</h2>
            <p className="text-xs text-gray-400">
              {migrations.length} migration{migrations.length !== 1 ? 's' : ''} applied
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowRollbackPanel(!showRollbackPanel)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            showRollbackPanel
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-gray-300'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Rollback
        </button>
      </div>

      {/* Rollback Panel */}
      <AnimatePresence>
        {showRollbackPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 space-y-3">
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Rollback Migrations</span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-400">Roll back last</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={rollbackCount}
                  onChange={(e) => setRollbackCount(Math.min(10, Math.max(1, Number(e.target.value))))}
                  className="w-16 px-2 py-1 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-white font-mono focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 outline-none"
                />
                <span className="text-xs text-gray-400">migration{rollbackCount !== 1 ? 's' : ''}</span>
                <button
                  onClick={handleDryRun}
                  disabled={isRollingBack}
                  className="ml-auto px-3 py-1.5 rounded text-xs font-medium bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50 transition-all"
                >
                  {isRollingBack ? 'Generating...' : 'Preview DDL'}
                </button>
              </div>

              {/* Dry-run preview */}
              {rollbackPreview && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-400 font-medium">
                    Generated reverse DDL ({rollbackPreview.results.length} migration{rollbackPreview.results.length !== 1 ? 's' : ''}):
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded bg-gray-900/80 border border-gray-700/50 p-3 space-y-2">
                    {rollbackPreview.results.map((r) => (
                      <div key={r.migration} className="space-y-1">
                        <div className="text-xs text-gray-300 font-mono">{r.migration}</div>
                        {r.ddl.map((stmt, i) => (
                          <div
                            key={i}
                            className={`text-xs font-mono pl-3 ${
                              stmt.startsWith('--') ? 'text-gray-500' : 'text-red-400'
                            }`}
                          >
                            {stmt}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {!confirmRollback ? (
                    <button
                      onClick={() => setConfirmRollback(true)}
                      className="px-3 py-1.5 rounded text-xs font-medium bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
                    >
                      Execute Rollback...
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400 font-medium">
                        This will permanently drop tables. Are you sure?
                      </span>
                      <button
                        onClick={handleRollback}
                        disabled={isRollingBack}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-all"
                      >
                        {isRollingBack ? 'Rolling back...' : 'Confirm Rollback'}
                      </button>
                      <button
                        onClick={() => setConfirmRollback(false)}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search migrations or tables..."
          className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
        />
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {Object.entries(groupedByDate).map(([date, dateMigrations]) => (
          <div key={date} className="space-y-1">
            {/* Date header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500/60" />
              <span className="text-xs font-mono text-cyan-400/80">{date}</span>
              <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/20 to-transparent" />
              <span className="text-xs text-gray-500">{dateMigrations.length}</span>
            </div>

            {/* Migration entries */}
            <div className="ml-1 border-l border-gray-700/50 pl-4 space-y-1">
              {dateMigrations.map((migration, idx) => {
                const isExpanded = expandedMigration === migration.name;
                return (
                  <motion.div
                    key={migration.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                  >
                    <button
                      onClick={() =>
                        setExpandedMigration(isExpanded ? null : migration.name)
                      }
                      className="w-full text-left group"
                    >
                      <div className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-white/5 transition-colors">
                        {/* Expand icon */}
                        <div className="text-gray-500 group-hover:text-gray-400 transition-colors">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </div>

                        {/* Status icon */}
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70 flex-shrink-0" />

                        {/* Migration name */}
                        <span className="text-sm font-mono text-gray-200 group-hover:text-white transition-colors truncate flex-1">
                          {migration.name}
                        </span>

                        {/* Table count badge */}
                        {migration.affected_tables.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Layers className="w-3 h-3" />
                            {migration.affected_tables.length}
                          </span>
                        )}

                        {/* Timestamp */}
                        <span className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(migration.applied_at)}
                        </span>
                      </div>
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-10 mb-2 p-3 rounded-lg bg-gray-800/50 border border-gray-700/30 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>Applied: {migration.applied_at}</span>
                            </div>

                            {migration.affected_tables.length > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <Table2 className="w-3 h-3" />
                                  <span>Affected tables:</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 ml-5">
                                  {migration.affected_tables.map((table) => (
                                    <span
                                      key={table}
                                      className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-400"
                                    >
                                      {table}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {migration.affected_tables.length === 0 && (
                              <div className="text-xs text-gray-500 italic">
                                No table metadata recorded for this migration
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Database className="w-8 h-8 text-gray-600" />
          <p className="text-sm text-gray-400">
            {searchQuery ? 'No migrations match your search' : 'No migrations applied yet'}
          </p>
        </div>
      )}
    </div>
  );
}
