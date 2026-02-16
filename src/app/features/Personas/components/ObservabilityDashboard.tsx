'use client';

import { useEffect, useState } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { DollarSign, Zap, CheckCircle, TrendingUp, RefreshCw } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#7c3aed', '#5b21b6', '#4f46e5'];

export default function ObservabilityDashboard() {
  const fetchObservabilityMetrics = usePersonaStore((s) => s.fetchObservabilityMetrics);
  const observabilityMetrics = usePersonaStore((s) => s.observabilityMetrics);
  const personas = usePersonaStore((s) => s.personas);
  const [days, setDays] = useState(30);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchObservabilityMetrics(days, selectedPersonaId || undefined);
  }, [days, selectedPersonaId, fetchObservabilityMetrics]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchObservabilityMetrics(days, selectedPersonaId || undefined);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, days, selectedPersonaId, fetchObservabilityMetrics]);

  const summary = observabilityMetrics?.summary;
  const timeSeries = observabilityMetrics?.timeSeries || [];

  // Aggregate time series by date for charts
  const dateMap = new Map<string, { date: string; cost: number; executions: number; success: number; failed: number; tokens: number }>();
  for (const row of timeSeries) {
    const date = row.execution_date || row.snapshot_date;
    const existing = dateMap.get(date) || { date, cost: 0, executions: 0, success: 0, failed: 0, tokens: 0 };
    existing.cost += row.total_cost_usd || 0;
    existing.executions += row.total_executions || 0;
    existing.success += row.successful_executions || 0;
    existing.failed += row.failed_executions || 0;
    existing.tokens += (row.total_input_tokens || 0) + (row.total_output_tokens || 0);
    dateMap.set(date, existing);
  }
  const chartData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Per-persona breakdown for pie chart
  const personaMap = new Map<string, { name: string; executions: number; cost: number }>();
  for (const row of timeSeries) {
    const pid = row.persona_id;
    const existing = personaMap.get(pid) || { name: row.persona_name || pid, executions: 0, cost: 0 };
    existing.executions += row.total_executions || 0;
    existing.cost += row.total_cost_usd || 0;
    personaMap.set(pid, existing);
  }
  const pieData = Array.from(personaMap.values()).filter(d => d.executions > 0);

  const successRate = summary?.total_executions > 0
    ? ((summary.successful_executions / summary.total_executions) * 100).toFixed(1)
    : '0';

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Observability</h1>
          <p className="text-sm text-muted-foreground/60 mt-0.5">Performance metrics, cost tracking, execution health</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range */}
          <div className="flex rounded-lg border border-primary/15 overflow-hidden">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  days === d ? 'bg-primary/15 text-primary' : 'text-muted-foreground/60 hover:bg-secondary/50'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          {/* Persona filter */}
          <select
            value={selectedPersonaId}
            onChange={(e) => setSelectedPersonaId(e.target.value)}
            className="px-3 py-1.5 bg-background/50 border border-primary/15 rounded-lg text-xs text-foreground"
          >
            <option value="">All Personas</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {/* Auto-refresh */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-1.5 rounded-lg border transition-colors ${
              autoRefresh ? 'border-primary/30 bg-primary/10 text-primary' : 'border-primary/15 text-muted-foreground/50'
            }`}
            title={autoRefresh ? 'Auto-refresh ON (30s)' : 'Auto-refresh OFF'}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} style={autoRefresh ? { animationDuration: '3s' } : {}} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard icon={DollarSign} label="Total Cost" value={`$${(summary?.total_cost_usd || 0).toFixed(2)}`} color="emerald" />
        <SummaryCard icon={Zap} label="Executions" value={String(summary?.total_executions || 0)} color="blue" />
        <SummaryCard icon={CheckCircle} label="Success Rate" value={`${successRate}%`} color="green" />
        <SummaryCard icon={TrendingUp} label="Active Personas" value={String(summary?.active_personas || 0)} color="purple" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Cost Over Time */}
        <div className="bg-secondary/30 border border-primary/15 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground/80 mb-3">Cost Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="cost" stroke="#6366f1" fill="url(#costGradient)" strokeWidth={2} />
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Execution Distribution */}
        <div className="bg-secondary/30 border border-primary/15 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground/80 mb-3">Executions by Persona</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="executions" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground/40">No execution data</div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="bg-secondary/30 border border-primary/15 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground/80 mb-3">Execution Health</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="success" name="Successful" fill="#22c55e" radius={[2, 2, 0, 0]} />
            <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  };
  const cls = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-secondary/30 border border-primary/15 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${cls}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-muted-foreground/60">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}
