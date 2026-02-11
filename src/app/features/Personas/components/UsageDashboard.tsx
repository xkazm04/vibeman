'use client';

import { useEffect, useState, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = ['#3B82F6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#EA4335', '#4A154B', '#06b6d4'];

const GRID_STROKE = 'rgba(255,255,255,0.06)';
const AXIS_TICK_FILL = 'rgba(255,255,255,0.4)';

type DayRange = 7 | 30 | 90;

const dayOptions: Array<{ value: DayRange; label: string }> = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
];

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-zinc-900/95 backdrop-blur border border-white/10 rounded-xl shadow-2xl px-4 py-3">
      {label && <p className="text-xs text-white/50 mb-1.5">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-white/70">{entry.name}:</span>
          <span className="text-white font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatToolName(name: string): string {
  // e.g. "gmail_read" → "gmail read", but keep it concise
  return name.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UsageDashboard() {
  const toolUsageSummary = usePersonaStore((s) => s.toolUsageSummary);
  const toolUsageOverTime = usePersonaStore((s) => s.toolUsageOverTime);
  const toolUsageByPersona = usePersonaStore((s) => s.toolUsageByPersona);
  const fetchToolUsage = usePersonaStore((s) => s.fetchToolUsage);
  const personas = usePersonaStore((s) => s.personas);

  const [days, setDays] = useState<DayRange>(30);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

  useEffect(() => {
    fetchToolUsage(days, selectedPersonaId || undefined);
  }, [days, selectedPersonaId, fetchToolUsage]);

  // Pivot overTime data into wide format for AreaChart:
  // [{ date, gmail_read: 5, http_request: 3 }, ...]
  const areaData = useMemo(() => {
    if (!toolUsageOverTime.length) return [];

    const dateMap = new Map<string, Record<string, number>>();
    const toolNames = new Set<string>();

    for (const row of toolUsageOverTime) {
      toolNames.add(row.tool_name);
      if (!dateMap.has(row.date)) {
        dateMap.set(row.date, {});
      }
      const entry = dateMap.get(row.date)!;
      entry[row.tool_name] = (entry[row.tool_name] || 0) + row.invocations;
    }

    // Sort dates chronologically
    const sortedDates = Array.from(dateMap.keys()).sort();
    return sortedDates.map((date) => ({
      date,
      ...dateMap.get(date),
    }));
  }, [toolUsageOverTime]);

  const allToolNames = useMemo(() => {
    const names = new Set<string>();
    for (const row of toolUsageOverTime) {
      names.add(row.tool_name);
    }
    return Array.from(names);
  }, [toolUsageOverTime]);

  // Pie chart data: use summary
  const pieData = useMemo(
    () =>
      toolUsageSummary.map((s) => ({
        name: formatToolName(s.tool_name),
        value: s.total_invocations,
      })),
    [toolUsageSummary]
  );

  // Bar chart: horizontal bars sorted descending
  const barData = useMemo(
    () =>
      [...toolUsageSummary]
        .sort((a, b) => b.total_invocations - a.total_invocations)
        .map((s) => ({
          name: formatToolName(s.tool_name),
          invocations: s.total_invocations,
          executions: s.unique_executions,
          personas: s.unique_personas,
        })),
    [toolUsageSummary]
  );

  // By-persona bar data
  const personaBarData = useMemo(
    () =>
      [...toolUsageByPersona]
        .sort((a, b) => b.total_invocations - a.total_invocations)
        .map((p) => ({
          name: p.persona_name || p.persona_id,
          invocations: p.total_invocations,
          tools: p.unique_tools,
          color: p.persona_color || '#3B82F6',
        })),
    [toolUsageByPersona]
  );

  const isEmpty =
    toolUsageSummary.length === 0 &&
    toolUsageOverTime.length === 0 &&
    toolUsageByPersona.length === 0;

  // ── Empty State ──────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground/50">
        <BarChart3 className="w-12 h-12" />
        <p className="text-sm">No tool usage data yet</p>
        <p className="text-xs text-muted-foreground/30">
          Usage analytics will appear after personas execute tools
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-5 gap-6">
      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Persona filter */}
        <select
          value={selectedPersonaId || ''}
          onChange={(e) => setSelectedPersonaId(e.target.value || null)}
          className="bg-secondary/50 border border-primary/20 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer"
        >
          <option value="">All Personas</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon ? `${p.icon} ` : ''}{p.name}
            </option>
          ))}
        </select>

        {/* Time range pills */}
        <div className="flex items-center gap-1 p-1 bg-secondary/50 backdrop-blur-md rounded-xl border border-primary/20">
          {dayOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                days === opt.value
                  ? 'bg-background text-foreground shadow-sm border border-primary/20'
                  : 'text-muted-foreground/60 hover:text-muted-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Top Row: Bar Chart + Pie Chart ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Tool Invocations (horizontal bar) */}
        <div className="lg:col-span-3 bg-secondary/30 border border-primary/10 rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground/70 mb-4">Tool Invocations</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 40)}>
            <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="invocations" name="Invocations" fill={COLORS[0]} radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution (pie) */}
        <div className="lg:col-span-2 bg-secondary/30 border border-primary/10 rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground/70 mb-4">Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                stroke="none"
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-white/50">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Usage Over Time (stacked area) ─────────────────────── */}
      {areaData.length > 0 && (
        <div className="bg-secondary/30 border border-primary/10 rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground/70 mb-4">Usage Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={areaData} margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                dataKey="date"
                tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                verticalAlign="top"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-white/50">{formatToolName(value)}</span>
                )}
              />
              {allToolNames.map((toolName, idx) => (
                <Area
                  key={toolName}
                  type="monotone"
                  dataKey={toolName}
                  name={toolName}
                  stackId="1"
                  fill={COLORS[idx % COLORS.length]}
                  fillOpacity={0.3}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── By Persona (horizontal bar) ───────────────────────── */}
      {personaBarData.length > 0 && (
        <div className="bg-secondary/30 border border-primary/10 rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground/70 mb-4">By Persona</h3>
          <ResponsiveContainer width="100%" height={Math.max(180, personaBarData.length * 44)}>
            <BarChart data={personaBarData} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                width={140}
                tick={{ fill: AXIS_TICK_FILL, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="invocations" name="Invocations" radius={[0, 4, 4, 0]} barSize={22}>
                {personaBarData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default UsageDashboard;
