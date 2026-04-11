'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { GitPullRequest, GitMerge, ExternalLink } from 'lucide-react';
import type { DbPullRequest } from '@/app/db/repositories/pull-request.repository';

interface PRActivityPanelProps {
  projectId: string;
}

const STATE_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  open:   { bg: 'bg-green-500/10', text: 'text-green-400', icon: GitPullRequest },
  merged: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: GitMerge },
  closed: { bg: 'bg-red-500/10', text: 'text-red-400', icon: GitPullRequest },
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function PRActivityPanel({ projectId }: PRActivityPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['pull-requests', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/pull-requests?projectId=${projectId}&limit=10`);
      if (!res.ok) return { pullRequests: [], goalCounts: [] };
      const json = await res.json();
      return json.data as { pullRequests: DbPullRequest[]; goalCounts: { goal_id: string; open_count: number; merged_count: number }[] };
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const prs = data?.pullRequests ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2 p-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (prs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <GitPullRequest className="w-6 h-6 text-white/20 mb-2" />
        <p className="text-xs text-white/30">No pull requests yet</p>
        <p className="text-2xs text-white/20 mt-1">Configure a GitHub webhook to track PRs</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {prs.map((pr, i) => {
        const style = STATE_STYLES[pr.state] || STATE_STYLES.open;
        const StateIcon = style.icon;
        return (
          <motion.div
            key={pr.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <div className={`p-1 rounded ${style.bg} mt-0.5`}>
              <StateIcon className={`w-3 h-3 ${style.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/80 truncate">{pr.title}</span>
                <a
                  href={pr.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3 text-white/40 hover:text-white/70" />
                </a>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xs text-white/40">#{pr.pr_number}</span>
                {pr.author && <span className="text-2xs text-white/30">by {pr.author}</span>}
                <span className="text-2xs text-white/20">{formatTimeAgo(pr.created_at)}</span>
                {pr.additions > 0 && (
                  <span className="text-2xs text-green-400/60">+{pr.additions}</span>
                )}
                {pr.deletions > 0 && (
                  <span className="text-2xs text-red-400/60">-{pr.deletions}</span>
                )}
              </div>
              {pr.digest && (
                <p className="text-2xs text-white/30 mt-1 line-clamp-2">
                  {pr.digest.replace(/\*\*/g, '').slice(0, 120)}
                </p>
              )}
            </div>
            <span className={`text-2xs px-1.5 py-0.5 rounded ${style.bg} ${style.text} flex-shrink-0`}>
              {pr.state}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
