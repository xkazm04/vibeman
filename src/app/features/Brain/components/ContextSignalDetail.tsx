'use client';

import { useEffect, useState } from 'react';
import { FileCode, GitCommit, Globe, Clock, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import type { DbBehavioralSignal, GitActivitySignalData, ApiFocusSignalData } from '@/app/db/models/brain.types';
import type { DrillDownTarget } from './SignalDetailDrawer';
import { useClientProjectStore } from '@/stores/clientProjectStore';

interface ContextSignalDetailProps {
  target: DrillDownTarget;
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = Date.now();
  const diff = now - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'less than 1h ago';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function ContextSignalDetail({ target }: ContextSignalDetailProps) {
  const [signals, setSignals] = useState<DbBehavioralSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeProject = useClientProjectStore(s => s.activeProject);

  useEffect(() => {
    if (!activeProject?.id) return;

    const fetchSignals = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ projectId: activeProject.id, limit: '30' });

        // Add filters based on target type
        if (target.type === 'context') {
          params.set('contextId', target.id);
        } else if (target.type === 'theme') {
          params.set('signalType', 'git_activity');
        } else if (target.type === 'endpoint') {
          params.set('signalType', 'api_focus');
        }

        const res = await fetch(`/api/brain/signals?${params.toString()}`);
        const data = await res.json();

        if (!data.success) {
          setError(data.error || 'Failed to fetch signals');
          return;
        }

        let filtered = data.signals as DbBehavioralSignal[];

        // Client-side filter for theme and endpoint (data payload match)
        if (target.type === 'theme') {
          filtered = filtered.filter(s => {
            try {
              const payload = JSON.parse(s.data) as GitActivitySignalData;
              return payload.commitMessage?.toLowerCase().includes(target.theme.toLowerCase());
            } catch { return false; }
          });
        } else if (target.type === 'endpoint') {
          filtered = filtered.filter(s => {
            try {
              const payload = JSON.parse(s.data) as ApiFocusSignalData;
              return payload.endpoint === target.path;
            } catch { return false; }
          });
        }

        setSignals(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
  }, [activeProject?.id, target]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-zinc-800/50 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <p className="text-xs text-red-300">{error}</p>
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-zinc-500">No signals found for this item.</p>
        <p className="text-xs text-zinc-600 mt-1">Signals are recorded as you work on the project.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500 mb-3">
        {signals.length} signal{signals.length !== 1 ? 's' : ''} found
      </p>
      {signals.map((signal) => (
        <SignalCard key={signal.id} signal={signal} targetType={target.type} />
      ))}
    </div>
  );
}

function SignalCard({ signal, targetType }: { signal: DbBehavioralSignal; targetType: DrillDownTarget['type'] }) {
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(signal.data); } catch { /* empty */ }

  return (
    <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-800/50 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SignalTypeIcon type={signal.signal_type} />
          <span className="text-xs font-medium text-zinc-300">
            {signal.signal_type.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimestamp(signal.timestamp)}
          </span>
          <WeightBadge weight={signal.weight} />
        </div>
      </div>

      {/* Payload details based on type */}
      {targetType === 'context' && <ContextPayload signal={signal} parsed={parsed} />}
      {targetType === 'theme' && <ThemePayload parsed={parsed as unknown as GitActivitySignalData} />}
      {targetType === 'endpoint' && <EndpointPayload parsed={parsed as unknown as ApiFocusSignalData} />}
    </div>
  );
}

function SignalTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'git_activity': return <GitCommit className="w-3.5 h-3.5 text-green-400" />;
    case 'api_focus': return <Globe className="w-3.5 h-3.5 text-blue-400" />;
    case 'context_focus': return <FileCode className="w-3.5 h-3.5 text-purple-400" />;
    case 'implementation': return <FileCode className="w-3.5 h-3.5 text-cyan-400" />;
    default: return <FileCode className="w-3.5 h-3.5 text-zinc-400" />;
  }
}

function WeightBadge({ weight }: { weight: number }) {
  const color = weight >= 2.0 ? 'text-amber-400 bg-amber-500/10'
    : weight >= 1.5 ? 'text-cyan-400 bg-cyan-500/10'
    : 'text-zinc-400 bg-zinc-700/50';

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${color}`}>
      w:{weight.toFixed(1)}
    </span>
  );
}

function ContextPayload({ signal, parsed }: { signal: DbBehavioralSignal; parsed: Record<string, unknown> }) {
  // Render based on signal_type
  switch (signal.signal_type) {
    case 'git_activity': {
      const data = parsed as unknown as GitActivitySignalData;
      return (
        <div className="space-y-1">
          {data.commitMessage && (
            <p className="text-xs text-zinc-400 italic">&ldquo;{data.commitMessage}&rdquo;</p>
          )}
          {data.filesChanged?.length > 0 && (
            <p className="text-[10px] text-zinc-500">
              {data.filesChanged.length} files, +{data.linesAdded || 0}/-{data.linesRemoved || 0} lines
            </p>
          )}
          {data.commitSha && (
            <code className="text-[10px] text-zinc-600">{data.commitSha.substring(0, 7)}</code>
          )}
        </div>
      );
    }
    case 'api_focus': {
      const data = parsed as unknown as ApiFocusSignalData;
      return (
        <div className="space-y-1">
          <code className="text-xs text-zinc-400">{data.method} {data.endpoint}</code>
          <p className="text-[10px] text-zinc-500">
            {data.callCount} calls, {data.avgResponseTime?.toFixed(0)}ms avg, {(data.errorRate * 100).toFixed(1)}% errors
          </p>
        </div>
      );
    }
    case 'implementation': {
      const data = parsed as unknown as { requirementName?: string; success?: boolean; filesModified?: string[]; filesCreated?: string[] };
      return (
        <div className="space-y-1">
          {data.requirementName && (
            <p className="text-xs text-zinc-400">{data.requirementName}</p>
          )}
          <p className="text-[10px] text-zinc-500">
            {data.success ? 'Success' : 'Failed'}
            {data.filesModified && ` — ${data.filesModified.length} modified`}
            {data.filesCreated && `, ${data.filesCreated.length} created`}
          </p>
        </div>
      );
    }
    default:
      return (
        <pre className="text-[10px] text-zinc-500 overflow-x-auto max-h-20 whitespace-pre-wrap">
          {JSON.stringify(parsed, null, 2).substring(0, 300)}
        </pre>
      );
  }
}

function ThemePayload({ parsed }: { parsed: GitActivitySignalData }) {
  return (
    <div className="space-y-1">
      {parsed.commitMessage && (
        <p className="text-xs text-zinc-300">&ldquo;{parsed.commitMessage}&rdquo;</p>
      )}
      <div className="flex items-center gap-3 text-[10px] text-zinc-500">
        {parsed.commitSha && <code>{parsed.commitSha.substring(0, 7)}</code>}
        {parsed.filesChanged?.length > 0 && <span>{parsed.filesChanged.length} files</span>}
        <span>+{parsed.linesAdded || 0}/-{parsed.linesRemoved || 0}</span>
        {parsed.branch && <span className="text-zinc-600">{parsed.branch}</span>}
      </div>
    </div>
  );
}

function EndpointPayload({ parsed }: { parsed: ApiFocusSignalData }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <code className="text-xs text-zinc-300">{parsed.method} {parsed.endpoint}</code>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-1.5 rounded bg-zinc-900/50">
          <p className="text-xs font-medium text-zinc-300">{parsed.callCount || 0}</p>
          <p className="text-[10px] text-zinc-600">calls</p>
        </div>
        <div className="text-center p-1.5 rounded bg-zinc-900/50">
          <p className="text-xs font-medium text-zinc-300">{parsed.avgResponseTime?.toFixed(0) || '—'}ms</p>
          <p className="text-[10px] text-zinc-600">avg time</p>
        </div>
        <div className="text-center p-1.5 rounded bg-zinc-900/50">
          <p className={`text-xs font-medium ${(parsed.errorRate || 0) > 0.05 ? 'text-red-400' : 'text-zinc-300'}`}>
            {((parsed.errorRate || 0) * 100).toFixed(1)}%
          </p>
          <p className="text-[10px] text-zinc-600">errors</p>
        </div>
      </div>
    </div>
  );
}
