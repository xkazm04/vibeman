'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Search,
  Play,
  Table2,
  Clock,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Loader2,
  Sparkles,
  AlertTriangle,
  GitBranch,
  Activity,
  MousePointerClick,
  BookOpen,
} from 'lucide-react';
import MigrationTimeline from '../System/MigrationTimeline';
import SystemHealthDashboard from '../System/SystemHealthDashboard';
import SchemaBrowserView from './SchemaBrowserView';
import KnowledgeBasePanel from './KnowledgeBasePanel';

// ── Types ────────────────────────────────────────────────────────────
interface ColumnInfo {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
}

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
}

interface QueryResult {
  success: boolean;
  question?: string;
  sql?: string;
  explanation?: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  rowCount?: number;
  durationMs?: number;
  provider?: string;
  model?: string;
  error?: string;
  rawResponse?: string;
}

// ── Example questions ────────────────────────────────────────────────
const EXAMPLE_QUESTIONS = [
  'How many ideas were accepted per context?',
  'Show the 10 most recent scans with their type and summary',
  'Which contexts have the most implemented tasks?',
  'List brain insights created in the last 7 days',
  'What is the average effort and impact score of accepted ideas?',
  'Show goals grouped by status with count',
  'Which scan types produce the most ideas?',
  'List implementation logs with their context names',
];

// ── Schema Browser Panel ─────────────────────────────────────────────
function SchemaBrowser({ tables, onTableClick }: { tables: TableInfo[]; onTableClick: (name: string) => void }) {
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const filtered = tables.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-700/50">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Filter tables..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-800/60 border border-gray-700/50 rounded text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
          />
        </div>
        <div className="mt-1.5 text-[10px] text-gray-500 font-mono">{filtered.length} tables</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((table) => (
          <div key={table.name} className="border-b border-gray-800/50">
            <button
              onClick={() => setExpandedTable(expandedTable === table.name ? null : table.name)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs hover:bg-gray-800/50 transition-colors group/tbl"
            >
              {expandedTable === table.name ? (
                <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
              )}
              <Table2 className="w-3 h-3 text-cyan-500/70 flex-shrink-0" />
              <span className="text-gray-300 font-mono truncate">{table.name}</span>
              <span className="ml-auto text-[10px] text-gray-600 flex-shrink-0 mr-1">{table.rowCount}</span>
              <span
                className="flex-shrink-0 p-0.5 rounded opacity-0 group-hover/tbl:opacity-100 hover:bg-cyan-500/20 text-gray-600 hover:text-cyan-400 transition-all"
                onClick={(e) => { e.stopPropagation(); onTableClick(table.name); }}
                title="Browse rows"
              >
                <MousePointerClick className="w-3 h-3" />
              </span>
            </button>
            <AnimatePresence>
              {expandedTable === table.name && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-2 pl-8">
                    {table.columns.map((col) => (
                      <div key={col.name} className="flex items-center gap-1.5 py-0.5 text-[11px]">
                        <span className={`font-mono ${col.pk ? 'text-amber-400' : 'text-gray-400'}`}>
                          {col.name}
                        </span>
                        <span className="text-gray-600 text-[10px]">{col.type}</span>
                        {col.pk && <span className="text-[9px] text-amber-500/70 bg-amber-500/10 px-1 rounded">PK</span>}
                        {col.notnull && <span className="text-[9px] text-gray-600">NN</span>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SQL Display with copy ────────────────────────────────────────────
function SqlDisplay({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sql]);

  return (
    <div className="relative group">
      <pre className="text-xs font-mono text-cyan-300/90 bg-gray-900/80 border border-gray-700/40 rounded p-3 overflow-x-auto whitespace-pre-wrap">
        {sql}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1 rounded bg-gray-800/80 border border-gray-700/40 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
      </button>
    </div>
  );
}

// ── Results Table ────────────────────────────────────────────────────
function ResultsTable({ columns, rows }: { columns: string[]; rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">No rows returned</div>
    );
  }

  return (
    <div className="overflow-auto max-h-[50vh] rounded border border-gray-700/40">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-gray-800 z-10">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left text-gray-400 font-medium font-mono border-b border-gray-700/50 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-800/40 transition-colors">
              {columns.map((col) => (
                <td key={col} className="px-3 py-1.5 text-gray-300 border-b border-gray-800/50 font-mono whitespace-nowrap max-w-[300px] truncate">
                  {row[col] === null ? <span className="text-gray-600 italic">null</span> : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Sidebar Tab Type ────────────────────────────────────────────────
type SidebarTab = 'schema' | 'migrations' | 'health' | 'knowledge';

// ── Main Layout ──────────────────────────────────────────────────────
export default function ExplorerLayout() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [history, setHistory] = useState<Array<{ question: string; sql: string; rowCount: number }>>([]);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('schema');
  const [browsingTable, setBrowsingTable] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load schema on mount
  useEffect(() => {
    fetch('/api/nl-query')
      .then(r => r.json())
      .then(data => { if (data.success) setTables(data.tables); })
      .catch(() => {});
  }, []);

  const handleQuery = useCallback(async (q?: string) => {
    const queryText = q || question;
    if (!queryText.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/nl-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText }),
      });
      const data: QueryResult = await res.json();
      setResult(data);

      if (data.success && data.sql) {
        setHistory(prev => [
          { question: queryText, sql: data.sql!, rowCount: data.rowCount ?? 0 },
          ...prev.slice(0, 19),
        ]);
      }
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setLoading(false);
    }
  }, [question, loading]);

  const handleTableClick = useCallback((name: string) => {
    setBrowsingTable(name);
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 overflow-hidden">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-64 flex-shrink-0 bg-gray-900/60 border-r border-gray-700/30 flex flex-col"
      >
        {/* Sidebar Tabs */}
        <div className="flex border-b border-gray-700/30">
          <button
            onClick={() => setSidebarTab('schema')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              sidebarTab === 'schema'
                ? 'text-cyan-400 border-b-2 border-cyan-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Schema
          </button>
          <button
            onClick={() => setSidebarTab('migrations')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              sidebarTab === 'migrations'
                ? 'text-cyan-400 border-b-2 border-cyan-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Migrations
          </button>
          <button
            onClick={() => setSidebarTab('health')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              sidebarTab === 'health'
                ? 'text-cyan-400 border-b-2 border-cyan-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Health
          </button>
          <button
            onClick={() => setSidebarTab('knowledge')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              sidebarTab === 'knowledge'
                ? 'text-cyan-400 border-b-2 border-cyan-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Knowledge base"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Knowledge
          </button>
        </div>

        {/* Tab Content */}
        {sidebarTab === 'schema' ? (
          <SchemaBrowser tables={tables} onTableClick={handleTableClick} />
        ) : sidebarTab === 'migrations' ? (
          <div className="flex-1 overflow-y-auto p-3">
            <MigrationTimeline />
          </div>
        ) : sidebarTab === 'knowledge' ? (
          <KnowledgeBasePanel />
        ) : (
          <div className="flex-1 overflow-y-auto p-3">
            <SystemHealthDashboard />
          </div>
        )}
      </motion.div>

      {/* Main Content — Browser or Query */}
      {browsingTable ? (
        <SchemaBrowserView tableName={browsingTable} onBack={() => setBrowsingTable(null)} />
      ) : (
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="px-6 py-4 border-b border-gray-700/30 bg-gray-900/40"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-light text-white tracking-wide">Database Explorer</h1>
              <p className="text-xs text-gray-500">Ask questions in plain English — AI translates to SQL</p>
            </div>
          </div>

          {/* Query Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleQuery(); }}
                placeholder="Ask a question about your data..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-800/60 border border-gray-700/50 rounded-lg text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                disabled={loading}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuery()}
              disabled={loading || !question.trim()}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/10"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Query
            </motion.button>
          </div>

          {/* Example Questions */}
          {!result && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {EXAMPLE_QUESTIONS.slice(0, 4).map((eq) => (
                <button
                  key={eq}
                  onClick={() => { setQuestion(eq); handleQuery(eq); }}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                >
                  {eq}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-16"
              >
                <div className="flex items-center gap-3 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
                  <span className="text-sm">Translating your question to SQL...</span>
                </div>
              </motion.div>
            )}

            {!loading && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Error State */}
                {!result.success && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm text-red-300">{result.error}</div>
                      {result.sql && (
                        <div className="mt-2">
                          <SqlDisplay sql={result.sql} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Success State */}
                {result.success && (
                  <>
                    {/* Explanation */}
                    {result.explanation && (
                      <div className="text-sm text-gray-400">
                        <span className="text-gray-500">AI:</span> {result.explanation}
                      </div>
                    )}

                    {/* Generated SQL */}
                    {result.sql && <SqlDisplay sql={result.sql} />}

                    {/* Stats Bar */}
                    <div className="flex items-center gap-4 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Table2 className="w-3 h-3" />
                        {result.rowCount} rows
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {result.durationMs}ms
                      </span>
                      {result.provider && (
                        <span className="text-gray-600">
                          via {result.provider}{result.model ? ` / ${result.model}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Results Table */}
                    {result.columns && result.rows && (
                      <ResultsTable columns={result.columns} rows={result.rows} />
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* Empty State */}
            {!loading && !result && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <Database className="w-10 h-10 text-gray-700 mb-4" />
                <h3 className="text-sm font-medium text-gray-400 mb-1">Ask anything about your data</h3>
                <p className="text-xs text-gray-600 max-w-sm">
                  Type a question in plain English and the AI will translate it into a SQL query,
                  execute it, and show you the results.
                </p>

                {/* More examples */}
                <div className="mt-6 grid grid-cols-2 gap-2 max-w-lg">
                  {EXAMPLE_QUESTIONS.map((eq) => (
                    <button
                      key={eq}
                      onClick={() => { setQuestion(eq); handleQuery(eq); }}
                      className="text-left text-[11px] px-3 py-2 rounded bg-gray-800/40 border border-gray-700/30 text-gray-500 hover:text-cyan-400 hover:border-cyan-500/20 transition-colors"
                    >
                      &ldquo;{eq}&rdquo;
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* History Bar (bottom) */}
        {history.length > 0 && (
          <div className="px-6 py-2 border-t border-gray-700/30 bg-gray-900/40">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Clock className="w-3 h-3 text-gray-600 flex-shrink-0" />
              {history.slice(0, 5).map((h, i) => (
                <button
                  key={i}
                  onClick={() => { setQuestion(h.question); handleQuery(h.question); }}
                  className="text-[10px] px-2 py-0.5 rounded bg-gray-800/50 border border-gray-700/30 text-gray-500 hover:text-gray-300 whitespace-nowrap flex-shrink-0 transition-colors"
                  title={h.sql}
                >
                  {h.question.length > 40 ? h.question.slice(0, 40) + '…' : h.question}
                  <span className="ml-1 text-gray-600">({h.rowCount})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
