'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ProviderStats } from '../lib/types';
import { STATUS_CONFIG } from '../lib/config';

interface ProviderBreakdownProps {
  providers: ProviderStats[];
}

const PROVIDER_STYLES: Record<string, { color: string; borderColor: string; bgGradient: string; label: string }> = {
  claude: {
    color: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    bgGradient: 'from-purple-500/5 to-purple-600/2',
    label: 'Claude',
  },
  gemini: {
    color: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    bgGradient: 'from-blue-500/5 to-blue-600/2',
    label: 'Gemini',
  },
  copilot: {
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
    bgGradient: 'from-cyan-500/5 to-cyan-600/2',
    label: 'Copilot',
  },
  ollama: {
    color: 'text-green-400',
    borderColor: 'border-green-500/40',
    bgGradient: 'from-green-500/5 to-green-600/2',
    label: 'Ollama',
  },
};

const DEFAULT_STYLE = {
  color: 'text-gray-400',
  borderColor: 'border-gray-500/40',
  bgGradient: 'from-gray-500/5 to-gray-600/2',
  label: '',
};

function getProviderStyle(provider: string) {
  return PROVIDER_STYLES[provider.toLowerCase()] || { ...DEFAULT_STYLE, label: provider };
}

export default function ProviderBreakdown({ providers }: ProviderBreakdownProps) {
  if (!providers || providers.length === 0) return null;

  const sorted = [...providers].sort((a, b) => b.total - a.total);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.25 }}
    >
      <h2 className="text-sm font-semibold text-gray-400 mb-2">
        Provider Performance
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {sorted.map((stat, index) => {
          const style = getProviderStyle(stat.provider);

          const AcceptanceIcon = stat.acceptanceRatio >= 70
            ? TrendingUp
            : stat.acceptanceRatio <= 30
              ? TrendingDown
              : Minus;

          const acceptanceColor = stat.acceptanceRatio >= 70
            ? 'text-green-400'
            : stat.acceptanceRatio <= 30
              ? 'text-red-500'
              : 'text-yellow-400';

          return (
            <motion.div
              key={stat.provider}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              whileHover={{ scale: 1.02 }}
              className={`relative bg-gradient-to-br ${style.bgGradient} border ${style.borderColor} rounded-md p-2 backdrop-blur-sm overflow-hidden`}
              data-testid={`provider-card-${stat.provider}`}
            >
              {/* Header Row - Name + Total */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <h3 className={`text-xs font-semibold ${style.color} truncate flex-1`}>
                  {style.label}
                </h3>
                <span className={`text-xs font-mono ${style.color} opacity-50`}>
                  {stat.total}
                </span>
              </div>

              {/* Acceptance Rate */}
              <div className="flex items-center justify-center gap-1 mb-1.5">
                <AcceptanceIcon className={`w-3 h-3 ${acceptanceColor}`} />
                <span className={`text-lg font-bold ${acceptanceColor} font-mono`}>
                  {stat.acceptanceRatio}%
                </span>
              </div>

              {/* Status Numbers */}
              <div className="flex items-center justify-between text-[10px] font-mono px-0.5">
                <span className={STATUS_CONFIG.pending.color} title="Pending">{stat.pending}p</span>
                <span className={STATUS_CONFIG.rejected.color} title="Rejected">{stat.rejected}r</span>
                <span className={STATUS_CONFIG.accepted.color} title="Accepted">{stat.accepted}a</span>
                <span className={STATUS_CONFIG.implemented.color} title="Implemented">{stat.implemented}i</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
