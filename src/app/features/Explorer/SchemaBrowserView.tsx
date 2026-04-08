'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Trash2,
  Save,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Check,
  Table2,
  AlertTriangle,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────
interface ColumnMeta {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface CheckConstraint {
  column: string;
  values: string[];
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface BrowseResult {
  success: boolean;
  table: string;
  columns: ColumnMeta[];
  checks: CheckConstraint[];
  rows: Record<string, unknown>[];
  pagination: Pagination;
  error?: string;
}

interface EditingCell {
  rowIndex: number;
  column: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Detect if a column likely holds a timestamp/date value */
function isDateColumn(col: ColumnMeta): boolean {
  const n = col.name.toLowerCase();
  return n.endsWith('_at') || n.endsWith('_date') || n === 'timestamp' || col.type.toUpperCase().includes('DATE');
}

/** Detect if column is integer/numeric */
function isNumericColumn(col: ColumnMeta): boolean {
  const t = col.type.toUpperCase();
  return t.includes('INT') || t.includes('REAL') || t.includes('NUMERIC') || t.includes('FLOAT') || t.includes('DOUBLE');
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' && value.length > 120) return value.slice(0, 120) + '...';
  return String(value);
}

function getPkColumn(columns: ColumnMeta[]): string {
  const pk = columns.find(c => c.pk === 1);
  return pk?.name || 'id';
}

// ── Cell Editor ──────────────────────────────────────────────────────
function CellEditor({
  value,
  column,
  checks,
  onSave,
  onCancel,
}: {
  value: unknown;
  column: ColumnMeta;
  checks: CheckConstraint[];
  onSave: (val: unknown) => void;
  onCancel: () => void;
}) {
  const checkConstraint = checks.find(c => c.column === column.name);
  const [editValue, setEditValue] = useState<string>(value === null ? '' : String(value));
  const [isNull, setIsNull] = useState(value === null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    if (isNull) {
      onSave(null);
      return;
    }
    if (isNumericColumn(column)) {
      const num = Number(editValue);
      onSave(isNaN(num) ? editValue : num);
    } else {
      onSave(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') onCancel();
  };

  // Dropdown for CHECK constraint columns
  if (checkConstraint) {
    return (
      <div className="flex items-center gap-1">
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={isNull ? '__null__' : editValue}
          onChange={(e) => {
            if (e.target.value === '__null__') {
              setIsNull(true);
              setEditValue('');
            } else {
              setIsNull(false);
              setEditValue(e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          className="text-xs bg-gray-800 border border-cyan-500/50 rounded px-1.5 py-1 text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 min-w-[100px]"
        >
          {!column.notnull && <option value="__null__">NULL</option>}
          {checkConstraint.values.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <button onClick={handleSave} className="p-0.5 rounded hover:bg-emerald-500/20 text-emerald-400"><Check className="w-3 h-3" /></button>
        <button onClick={onCancel} className="p-0.5 rounded hover:bg-red-500/20 text-red-400"><X className="w-3 h-3" /></button>
      </div>
    );
  }

  // Date picker for date columns
  if (isDateColumn(column)) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="datetime-local"
          value={isNull ? '' : (editValue || '').replace(' ', 'T').slice(0, 16)}
          onChange={(e) => {
            setIsNull(false);
            setEditValue(e.target.value ? e.target.value.replace('T', ' ') + ':00' : '');
          }}
          onKeyDown={handleKeyDown}
          className="text-xs bg-gray-800 border border-cyan-500/50 rounded px-1.5 py-1 text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        />
        {!column.notnull && (
          <button
            onClick={() => { setIsNull(!isNull); if (!isNull) setEditValue(''); }}
            className={`text-[9px] px-1 py-0.5 rounded border ${isNull ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : 'border-gray-600 text-gray-500'}`}
          >
            NULL
          </button>
        )}
        <button onClick={handleSave} className="p-0.5 rounded hover:bg-emerald-500/20 text-emerald-400"><Check className="w-3 h-3" /></button>
        <button onClick={onCancel} className="p-0.5 rounded hover:bg-red-500/20 text-red-400"><X className="w-3 h-3" /></button>
      </div>
    );
  }

  // Number input for numeric columns
  if (isNumericColumn(column)) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="number"
          value={isNull ? '' : editValue}
          onChange={(e) => { setIsNull(false); setEditValue(e.target.value); }}
          onKeyDown={handleKeyDown}
          className="text-xs bg-gray-800 border border-cyan-500/50 rounded px-1.5 py-1 text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 w-24"
        />
        {!column.notnull && (
          <button
            onClick={() => { setIsNull(!isNull); if (!isNull) setEditValue(''); }}
            className={`text-[9px] px-1 py-0.5 rounded border ${isNull ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : 'border-gray-600 text-gray-500'}`}
          >
            NULL
          </button>
        )}
        <button onClick={handleSave} className="p-0.5 rounded hover:bg-emerald-500/20 text-emerald-400"><Check className="w-3 h-3" /></button>
        <button onClick={onCancel} className="p-0.5 rounded hover:bg-red-500/20 text-red-400"><X className="w-3 h-3" /></button>
      </div>
    );
  }

  // Long text → textarea; short text → input
  const isLongText = typeof value === 'string' && value.length > 80;
  if (isLongText) {
    return (
      <div className="flex flex-col gap-1">
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={isNull ? '' : editValue}
          onChange={(e) => { setIsNull(false); setEditValue(e.target.value); }}
          onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
          rows={3}
          className="text-xs bg-gray-800 border border-cyan-500/50 rounded px-1.5 py-1 text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 min-w-[200px] resize-y"
        />
        <div className="flex items-center gap-1">
          {!column.notnull && (
            <button
              onClick={() => { setIsNull(!isNull); if (!isNull) setEditValue(''); }}
              className={`text-[9px] px-1 py-0.5 rounded border ${isNull ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : 'border-gray-600 text-gray-500'}`}
            >
              NULL
            </button>
          )}
          <button onClick={handleSave} className="p-0.5 rounded hover:bg-emerald-500/20 text-emerald-400"><Check className="w-3 h-3" /></button>
          <button onClick={onCancel} className="p-0.5 rounded hover:bg-red-500/20 text-red-400"><X className="w-3 h-3" /></button>
        </div>
      </div>
    );
  }

  // Default text input
  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={isNull ? '' : editValue}
        onChange={(e) => { setIsNull(false); setEditValue(e.target.value); }}
        onKeyDown={handleKeyDown}
        className="text-xs bg-gray-800 border border-cyan-500/50 rounded px-1.5 py-1 text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 min-w-[120px]"
      />
      {!column.notnull && (
        <button
          onClick={() => { setIsNull(!isNull); if (!isNull) setEditValue(''); }}
          className={`text-[9px] px-1 py-0.5 rounded border ${isNull ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : 'border-gray-600 text-gray-500'}`}
        >
          NULL
        </button>
      )}
      <button onClick={handleSave} className="p-0.5 rounded hover:bg-emerald-500/20 text-emerald-400"><Check className="w-3 h-3" /></button>
      <button onClick={onCancel} className="p-0.5 rounded hover:bg-red-500/20 text-red-400"><X className="w-3 h-3" /></button>
    </div>
  );
}

// ── Insert Row Form ──────────────────────────────────────────────────
function InsertRowForm({
  columns,
  checks,
  onInsert,
  onCancel,
}: {
  columns: ColumnMeta[];
  checks: CheckConstraint[];
  onInsert: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [nullFields, setNullFields] = useState<Set<string>>(
    new Set(columns.filter(c => !c.notnull && !c.pk).map(c => c.name))
  );

  const editableColumns = columns.filter(c => {
    // Skip auto-generated columns
    if (c.dflt_value && (c.dflt_value.includes("datetime('now')") || c.dflt_value.includes('CURRENT_TIMESTAMP'))) return true;
    return true;
  });

  const handleSubmit = () => {
    const data: Record<string, unknown> = {};
    for (const col of editableColumns) {
      if (nullFields.has(col.name)) continue; // Skip null fields — don't include them
      const val = formData[col.name];
      if (val === undefined || val === '') continue;
      if (isNumericColumn(col)) {
        const num = Number(val);
        data[col.name] = isNaN(num) ? val : num;
      } else {
        data[col.name] = val;
      }
    }
    onInsert(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden border-b border-cyan-500/20 bg-cyan-500/5"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-cyan-400 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Insert New Row
          </h3>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors">
              <Save className="w-3 h-3" /> Insert
            </button>
            <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-gray-800 text-gray-400 border border-gray-700/50 hover:bg-gray-700/50 transition-colors">
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {editableColumns.map(col => {
            const check = checks.find(c => c.column === col.name);
            const isNulled = nullFields.has(col.name);
            return (
              <div key={col.name} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-mono text-gray-400">
                    {col.name}
                    {col.pk ? <span className="text-amber-400 ml-1">PK</span> : null}
                    {col.notnull ? <span className="text-red-400 ml-1">*</span> : null}
                  </label>
                  {!col.notnull && (
                    <button
                      onClick={() => {
                        const next = new Set(nullFields);
                        if (next.has(col.name)) next.delete(col.name); else next.add(col.name);
                        setNullFields(next);
                      }}
                      className={`text-[8px] px-1 rounded border ${isNulled ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : 'border-gray-700 text-gray-600'}`}
                    >
                      NULL
                    </button>
                  )}
                </div>
                {check ? (
                  <select
                    value={isNulled ? '' : (formData[col.name] || '')}
                    onChange={(e) => {
                      setFormData(p => ({ ...p, [col.name]: e.target.value }));
                      nullFields.delete(col.name);
                      setNullFields(new Set(nullFields));
                    }}
                    disabled={isNulled}
                    className="text-xs bg-gray-800/80 border border-gray-700/50 rounded px-2 py-1.5 text-gray-300 focus:outline-none focus:border-cyan-500/40 disabled:opacity-40"
                  >
                    <option value="">—</option>
                    {check.values.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : isDateColumn(col) ? (
                  <input
                    type="datetime-local"
                    value={isNulled ? '' : (formData[col.name] || '')}
                    onChange={(e) => {
                      setFormData(p => ({ ...p, [col.name]: e.target.value ? e.target.value.replace('T', ' ') + ':00' : '' }));
                      nullFields.delete(col.name);
                      setNullFields(new Set(nullFields));
                    }}
                    disabled={isNulled}
                    className="text-xs bg-gray-800/80 border border-gray-700/50 rounded px-2 py-1.5 text-gray-300 focus:outline-none focus:border-cyan-500/40 disabled:opacity-40"
                  />
                ) : isNumericColumn(col) ? (
                  <input
                    type="number"
                    value={isNulled ? '' : (formData[col.name] || '')}
                    onChange={(e) => {
                      setFormData(p => ({ ...p, [col.name]: e.target.value }));
                      nullFields.delete(col.name);
                      setNullFields(new Set(nullFields));
                    }}
                    disabled={isNulled}
                    className="text-xs bg-gray-800/80 border border-gray-700/50 rounded px-2 py-1.5 text-gray-300 focus:outline-none focus:border-cyan-500/40 disabled:opacity-40"
                  />
                ) : (
                  <input
                    type="text"
                    value={isNulled ? '' : (formData[col.name] || '')}
                    onChange={(e) => {
                      setFormData(p => ({ ...p, [col.name]: e.target.value }));
                      nullFields.delete(col.name);
                      setNullFields(new Set(nullFields));
                    }}
                    disabled={isNulled}
                    placeholder={col.dflt_value ? `default: ${col.dflt_value}` : ''}
                    className="text-xs bg-gray-800/80 border border-gray-700/50 rounded px-2 py-1.5 text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40 disabled:opacity-40"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main SchemaBrowserView ───────────────────────────────────────────
export default function SchemaBrowserView({
  tableName,
  onBack,
}: {
  tableName: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [saving, setSaving] = useState(false);
  const [showInsert, setShowInsert] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        action: 'rows',
        table: tableName,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (sortCol) {
        params.set('sort', sortCol);
        params.set('dir', sortDir);
      }
      const res = await fetch(`/api/schema-browser?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch rows');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [tableName, page, pageSize, sortCol, sortDir]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleSort = useCallback((col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
    setPage(1);
  }, [sortCol]);

  const handleCellSave = useCallback(async (rowIndex: number, column: string, value: unknown) => {
    if (!data) return;
    const pkCol = getPkColumn(data.columns);
    const row = data.rows[rowIndex];
    const id = row[pkCol];
    if (id === undefined || id === null) {
      showToast('Cannot update: row has no primary key value', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/schema-browser', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: tableName, id: String(id), idColumn: pkCol, column, value }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      // Optimistic update
      setData(prev => {
        if (!prev) return prev;
        const newRows = [...prev.rows];
        newRows[rowIndex] = { ...newRows[rowIndex], [column]: value };
        return { ...prev, rows: newRows };
      });
      setEditingCell(null);
      showToast('Cell updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  }, [data, tableName, showToast]);

  const handleInsert = useCallback(async (rowData: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/schema-browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: tableName, data: rowData }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setShowInsert(false);
      showToast('Row inserted', 'success');
      fetchRows();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Insert failed', 'error');
    }
  }, [tableName, showToast, fetchRows]);

  const handleDelete = useCallback(async (id: string) => {
    if (!data) return;
    const pkCol = getPkColumn(data.columns);
    try {
      const res = await fetch(`/api/schema-browser?table=${tableName}&id=${encodeURIComponent(id)}&idColumn=${pkCol}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDeleteConfirm(null);
      showToast('Row deleted', 'success');
      fetchRows();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  }, [data, tableName, showToast, fetchRows]);

  const pkCol = data ? getPkColumn(data.columns) : 'id';

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="px-6 py-3 border-b border-gray-700/30 bg-gray-900/40 flex items-center justify-between flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-gray-800/60 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20">
            <Table2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-light text-white tracking-wide font-mono">{tableName}</h1>
            <p className="text-[11px] text-gray-500">
              {data ? `${data.pagination.total} rows | ${data.columns.length} columns` : 'Loading...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInsert(!showInsert)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              showInsert
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                : 'bg-gray-800/60 text-gray-400 border-gray-700/50 hover:text-white hover:border-gray-600'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Insert Row
          </button>
          <button
            onClick={fetchRows}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gray-800/60 text-gray-400 border border-gray-700/50 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpDown className="w-3.5 h-3.5" />} Refresh
          </button>
        </div>
      </motion.div>

      {/* Insert Row Form */}
      <AnimatePresence>
        {showInsert && data && (
          <InsertRowForm
            columns={data.columns}
            checks={data.checks}
            onInsert={handleInsert}
            onCancel={() => setShowInsert(false)}
          />
        )}
      </AnimatePresence>

      {/* Error State */}
      {error && (
        <div className="mx-6 mt-3 flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="flex-1 overflow-auto">
        {loading && !data ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
            <span className="ml-2 text-sm text-gray-400">Loading table data...</span>
          </div>
        ) : data && data.rows.length > 0 ? (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-800/95 backdrop-blur-sm z-10">
              <tr>
                <th className="px-2 py-2 text-center text-gray-500 border-b border-gray-700/50 w-10">#</th>
                {data.columns.map(col => (
                  <th
                    key={col.name}
                    onClick={() => handleSort(col.name)}
                    className="px-3 py-2 text-left border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/30 transition-colors group whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span className={`font-mono font-medium ${col.pk ? 'text-amber-400' : 'text-gray-400'}`}>
                        {col.name}
                      </span>
                      <span className="text-[9px] text-gray-600">{col.type}</span>
                      {col.pk && <span className="text-[8px] text-amber-500/70 bg-amber-500/10 px-0.5 rounded">PK</span>}
                      {sortCol === col.name ? (
                        sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-700 group-hover:text-gray-500 transition-colors" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-gray-500 border-b border-gray-700/50 w-10 sticky right-0 bg-gray-800/95" />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rowIdx) => {
                const rowId = String(row[pkCol] ?? rowIdx);
                return (
                  <motion.tr
                    key={rowId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: rowIdx * 0.01 }}
                    className="hover:bg-gray-800/30 transition-colors group/row"
                  >
                    <td className="px-2 py-1.5 text-center text-gray-600 border-b border-gray-800/50 tabular-nums">
                      {(page - 1) * pageSize + rowIdx + 1}
                    </td>
                    {data.columns.map(col => {
                      const isEditing = editingCell?.rowIndex === rowIdx && editingCell?.column === col.name;
                      const cellValue = row[col.name];
                      return (
                        <td
                          key={col.name}
                          className="px-3 py-1.5 border-b border-gray-800/50 font-mono max-w-[300px]"
                        >
                          {isEditing ? (
                            <CellEditor
                              value={cellValue}
                              column={col}
                              checks={data.checks}
                              onSave={(val) => handleCellSave(rowIdx, col.name, val)}
                              onCancel={() => setEditingCell(null)}
                            />
                          ) : (
                            <span
                              onClick={() => !saving && setEditingCell({ rowIndex: rowIdx, column: col.name })}
                              className={`cursor-pointer rounded px-1 py-0.5 -mx-1 hover:bg-cyan-500/10 hover:ring-1 hover:ring-cyan-500/20 transition-all inline-block truncate max-w-full ${
                                cellValue === null ? 'text-gray-600 italic' : 'text-gray-300'
                              }`}
                              title={cellValue === null ? 'NULL' : String(cellValue)}
                            >
                              {cellValue === null ? 'NULL' : formatCellValue(cellValue)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 border-b border-gray-800/50 text-center sticky right-0 bg-gray-900/80">
                      {deleteConfirm === rowId ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(String(row[pkCol]))} className="p-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"><Check className="w-3 h-3" /></button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-0.5 rounded bg-gray-700/50 text-gray-400 hover:bg-gray-600/50"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(rowId)}
                          className="p-1 rounded opacity-0 group-hover/row:opacity-100 hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        ) : data ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Table2 className="w-10 h-10 text-gray-700 mb-4" />
            <h3 className="text-sm font-medium text-gray-400 mb-1">No rows in this table</h3>
            <p className="text-xs text-gray-600">Use "Insert Row" to add data.</p>
          </div>
        ) : null}
      </div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="px-6 py-2 border-t border-gray-700/30 bg-gray-900/40 flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-gray-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.pagination.total)} of {data.pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="p-1 rounded hover:bg-gray-800 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded hover:bg-gray-800 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-gray-400 px-2 tabular-nums">
              {page} / {data.pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
              className="p-1 rounded hover:bg-gray-800 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(data.pagination.totalPages)}
              disabled={page === data.pagination.totalPages}
              className="p-1 rounded hover:bg-gray-800 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 px-4 py-2 rounded-lg text-xs font-medium shadow-lg ${
              toast.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
