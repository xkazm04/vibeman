'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Zap, MessageSquare, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// ============================================================================
// Types
// ============================================================================

interface CostByDay {
  date: string;
  cost: number;
  sessions: number;
  tokensIn: number;
  tokensOut: number;
}

interface TopSession {
  id: string;
  projectPath: string;
  cost: number;
  tokensIn: number;
  tokensOut: number;
  messageCount: number;
  status: string;
  createdAt: string;
}

interface CostSummary {
  totalCost: number;
  totalTokensIn: number;
  totalTokensOut: number;
  sessionCount: number;
  avgCostPerSession: number;
  costByDay: CostByDay[];
  topSessions: TopSession[];
}

interface CostAnalyticsPanelProps {
  data: CostSummary | null;
  isLoading: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function formatCost(usd: number): string {
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ============================================================================
// Summary card
// ============================================================================

function SummaryCard({ label, value, icon: Icon, color, delay }: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-2xs text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-semibold text-zinc-200">{value}</p>
    </motion.div>
  );
}

// ============================================================================
// Main panel
// ============================================================================

export default function CostAnalyticsPanel({ data, isLoading }: CostAnalyticsPanelProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-zinc-900/40 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.sessionCount === 0) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-lg p-6 text-center">
        <DollarSign className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">No session cost data yet</p>
        <p className="text-2xs text-zinc-600 mt-1">Run Claude Code sessions to see cost analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Cost"
          value={formatCost(data.totalCost)}
          icon={DollarSign}
          color="#22c55e"
          delay={0}
        />
        <SummaryCard
          label="Sessions"
          value={String(data.sessionCount)}
          icon={MessageSquare}
          color="#06b6d4"
          delay={0.05}
        />
        <SummaryCard
          label="Avg / Session"
          value={formatCost(data.avgCostPerSession)}
          icon={TrendingUp}
          color="#a855f7"
          delay={0.1}
        />
        <SummaryCard
          label="Total Tokens"
          value={formatTokens(data.totalTokensIn + data.totalTokensOut)}
          icon={Zap}
          color="#f59e0b"
          delay={0.15}
        />
      </div>

      {/* Cost trend chart */}
      {data.costByDay.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-4"
        >
          <h4 className="text-xs font-medium text-zinc-400 mb-3">Cost Trend</h4>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data.costByDay}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatCost(v)}
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelFormatter={(label) => formatDate(String(label))}
                formatter={(value) => [formatCost(Number(value)), 'Cost']}
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#costGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Top sessions table */}
      {data.topSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg overflow-hidden"
        >
          <h4 className="text-xs font-medium text-zinc-400 px-4 py-2.5 border-b border-zinc-800/50">
            Top Sessions by Cost
          </h4>
          <div className="divide-y divide-zinc-800/30">
            {data.topSessions.slice(0, 5).map((session) => (
              <div key={session.id} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-800/20">
                <div className="flex-1 min-w-0">
                  <p className="text-2xs text-zinc-400 truncate font-mono">
                    {session.projectPath.split(/[\\/]/).pop()}
                  </p>
                  <p className="text-2xs text-zinc-600">
                    {formatDate(session.createdAt)} · {session.messageCount} msgs · {session.status}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-green-400">{formatCost(session.cost)}</p>
                  <p className="text-2xs text-zinc-600">
                    {formatTokens(session.tokensIn + session.tokensOut)} tokens
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
