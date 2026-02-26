'use client';

import { useEffect, useState } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, PieChart, Pie, Sector, Legend,
} from 'recharts';
import { DollarSign, Zap, CheckCircle, TrendingUp, RefreshCw, Stethoscope, AlertTriangle, CheckCircle2 } from 'lucide-react';
import HealingIssueModal from './HealingIssueModal';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#7c3aed', '#5b21b6', '#4f46e5'];

export default function ObservabilityDashboard() {
  const fetchObservabilityMetrics = usePersonaStore((s) => s.fetchObservabilityMetrics);
  const observabilityMetrics = usePersonaStore((s) => s.observabilityMetrics);
  const personas = usePersonaStore((s) => s.personas);
  const healingIssues = usePersonaStore((s) => s.healingIssues);
  const healingRunning = usePersonaStore((s) => s.healingRunning);
  const fetchHealingIssues = usePersonaStore((s) => s.fetchHealingIssues);
  const triggerHealing = usePersonaStore((s) => s.triggerHealing);
  const resolveHealingIssue = usePersonaStore((s) => s.resolveHealingIssue);
  const [days, setDays] = useState(30);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);

  useEffect(() => {
    fetchObservabilityMetrics(days, selectedPersonaId || undefined);
    fetchHealingIssues();
  }, [days, selectedPersonaId, fetchObservabilityMetrics, fetchHealingIssues]);

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
          <AreaChart data={chartData} responsive width="100%" height={240}>
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
        </div>

        {/* Execution Distribution */}
        <div className="bg-secondary/30 border border-primary/15 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground/80 mb-3">Executions by Persona</h3>
          {pieData.length > 0 ? (
            <PieChart responsive width="100%" height={240}>
                <Pie
                  data={pieData}
                  dataKey="executions"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  shape={(props: any) => <Sector {...props} fill={COLORS[props.index % COLORS.length]} />}
                />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground/40">No execution data</div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="bg-secondary/30 border border-primary/15 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground/80 mb-3">Execution Health</h3>
        <BarChart data={chartData} responsive width="100%" height={240}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="success" name="Successful" fill="#22c55e" radius={[2, 2, 0, 0]} />
            <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[2, 2, 0, 0]} />
          </BarChart>
      </div>

      {/* Health Issues Section */}
      <div className="rounded-2xl border border-primary/15 bg-secondary/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-primary/10 bg-primary/5">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-foreground/80">Health Issues</h3>
            {healingIssues.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {healingIssues.length}
              </span>
            )}
          </div>
          <button
            onClick={() => triggerHealing()}
            disabled={healingRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {healingRunning ? (
              <>
                <div className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Stethoscope className="w-3.5 h-3.5" />
                Run Analysis
              </>
            )}
          </button>
        </div>

        {/* Issues List */}
        {healingIssues.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <div className="text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400/40" />
              <p className="text-sm text-muted-foreground/50">No open issues</p>
              <p className="text-xs text-muted-foreground/30 mt-1">Run analysis to check for problems</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-primary/10">
            {healingIssues.map((issue: any) => {
              const sevColors: Record<string, string> = {
                low: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
                medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
                high: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
                critical: 'bg-red-500/15 text-red-400 border-red-500/20',
              };
              const catColors: Record<string, string> = {
                prompt: 'text-violet-400',
                tool: 'text-cyan-400',
                config: 'text-emerald-400',
                external: 'text-gray-400',
              };
              const age = Math.floor((Date.now() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60));
              const ageLabel = age < 1 ? 'just now' : age < 24 ? `${age}h ago` : `${Math.floor(age / 24)}d ago`;

              const isAutoFixed = issue.auto_fixed === 1;

              return (
                <div key={issue.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-secondary/40 transition-colors ${isAutoFixed ? 'opacity-70' : ''}`}>
                  {isAutoFixed ? (
                    <span className="inline-flex px-1.5 py-0.5 text-[9px] font-mono uppercase rounded-md border bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                      fixed
                    </span>
                  ) : (
                    <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-mono uppercase rounded-md border ${sevColors[issue.severity] || sevColors.medium}`}>
                      {issue.severity}
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedIssue(issue)}
                    className={`flex-1 text-left text-sm transition-colors truncate ${isAutoFixed ? 'text-foreground/50 line-through decoration-emerald-500/30' : 'text-foreground/80 hover:text-foreground'}`}
                  >
                    {issue.title}
                  </button>
                  <span className={`text-[10px] font-mono ${catColors[issue.category] || 'text-muted-foreground/40'}`}>
                    {issue.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground/30 w-16 text-right">{ageLabel}</span>
                  {!isAutoFixed && (
                    <button
                      onClick={() => resolveHealingIssue(issue.id)}
                      className="px-2 py-1 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Healing Issue Detail Modal */}
      {selectedIssue && (
        <HealingIssueModal
          issue={selectedIssue}
          onResolve={(id) => { resolveHealingIssue(id); setSelectedIssue(null); }}
          onClose={() => setSelectedIssue(null)}
        />
      )}
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
