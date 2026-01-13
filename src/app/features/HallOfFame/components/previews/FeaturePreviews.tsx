'use client';

import { motion } from 'framer-motion';
import {
  Image,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Wifi,
  WifiOff,
  Heart,
  ThumbsDown,
  Play,
  Pause,
  CheckCircle,
  Circle,
  Clock,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  GitBranch,
  Settings,
  Zap,
  Folder,
  HelpCircle,
  Package,
  Trophy,
  Target,
  Eye,
} from 'lucide-react';
import { PreviewProps } from './types';

// --- GoalsLayout Components ---

export function ScreenThumbnailPreview({ props }: PreviewProps) {
  const hasImage = props.hasImage !== false;
  const isHovered = props.isHovered === true;

  return (
    <motion.div
      className="relative w-32 h-24 rounded-lg overflow-hidden cursor-pointer"
      whileHover={{ scale: 1.05 }}
      animate={isHovered ? { y: -4 } : { y: 0 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50" />
      {hasImage ? (
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 flex items-center justify-center">
          <Image className="w-8 h-8 text-cyan-400/60" />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-gray-500">No preview</span>
        </div>
      )}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent"
        />
      )}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent">
        <span className="text-[10px] text-gray-300 truncate block">Dashboard</span>
      </div>
    </motion.div>
  );
}

export function CandidateCardPreview({ props }: PreviewProps) {
  const priority = (props.priority as string) || 'medium';
  const isEditing = props.isEditing === true;

  const priorityColors: Record<string, { border: string; bg: string; text: string }> = {
    critical: { border: 'border-red-500/50', bg: 'bg-red-500/10', text: 'text-red-400' },
    high: { border: 'border-orange-500/50', bg: 'bg-orange-500/10', text: 'text-orange-400' },
    medium: { border: 'border-yellow-500/50', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
    low: { border: 'border-green-500/50', bg: 'bg-green-500/10', text: 'text-green-400' },
  };

  const colors = priorityColors[priority] || priorityColors.medium;

  return (
    <motion.div
      className={`w-64 p-3 rounded-lg border ${colors.border} ${colors.bg} backdrop-blur-sm`}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={`text-xs font-semibold uppercase ${colors.text}`}>{priority}</span>
        <span className="text-[10px] text-gray-500 font-mono">85%</span>
      </div>
      <h3 className="text-sm font-medium text-gray-200 mb-2">Add authentication flow</h3>
      {isEditing ? (
        <textarea
          className="w-full h-12 text-xs bg-black/20 border border-gray-700/50 rounded p-2 text-gray-300 resize-none"
          defaultValue="Users need secure login..."
        />
      ) : (
        <p className="text-xs text-gray-400 line-clamp-2">Users need secure login with OAuth support</p>
      )}
      <div className="flex items-center gap-2 mt-3">
        <motion.button
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-500/20 text-green-400 rounded text-xs border border-green-500/30"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Check className="w-3 h-3" /> Accept
        </motion.button>
        <motion.button
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-500/20 text-red-400 rounded text-xs border border-red-500/30"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <X className="w-3 h-3" /> Reject
        </motion.button>
      </div>
    </motion.div>
  );
}

// --- IdeasLayout Components ---

export function ScanTypeCardPreview({ props }: PreviewProps) {
  const category = (props.category as string) || 'technical';
  const selected = props.selected === true;

  const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
    technical: { bg: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/40', text: 'text-cyan-400' },
    user: { bg: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/40', text: 'text-purple-400' },
    business: { bg: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/40', text: 'text-amber-400' },
    mastermind: { bg: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400' },
  };

  const colors = categoryColors[category] || categoryColors.technical;

  return (
    <motion.div
      className={`w-40 p-3 rounded-lg border ${colors.border} bg-gradient-to-br ${colors.bg} cursor-pointer ${selected ? 'ring-2 ring-white/30' : ''}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🐛</span>
        <span className={`text-sm font-medium ${colors.text}`}>Bug Hunter</span>
      </div>
      <p className="text-xs text-gray-400">Find potential bugs and edge cases</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-500">{category}</span>
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>
    </motion.div>
  );
}

export function ProviderStatusPreview({ props }: PreviewProps) {
  const state = (props.state as string) || 'connected';
  const variant = (props.variant as string) || 'full';

  const stateColors: Record<string, { bg: string; text: string; dot: string }> = {
    connected: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-500' },
    disconnected: { bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-500' },
    checking: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-500' },
    error: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500' },
    unknown: { bg: 'bg-gray-500/20', text: 'text-gray-500', dot: 'bg-gray-600' },
  };

  const colors = stateColors[state] || stateColors.connected;

  if (variant === 'dot') {
    return (
      <motion.div
        className={`w-2.5 h-2.5 rounded-full ${colors.dot}`}
        animate={state === 'checking' ? { opacity: [1, 0.5, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${colors.bg}`}>
        <motion.div
          className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}
          animate={state === 'checking' ? { opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <span className={`text-xs ${colors.text}`}>{state}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${colors.bg} border border-gray-700/30`}>
      {state === 'connected' ? (
        <Wifi className={`w-4 h-4 ${colors.text}`} />
      ) : (
        <WifiOff className={`w-4 h-4 ${colors.text}`} />
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">OpenAI</span>
          <motion.div
            className={`w-2 h-2 rounded-full ${colors.dot}`}
            animate={state === 'checking' ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        </div>
        <span className="text-xs text-gray-500">gpt-4</span>
      </div>
    </div>
  );
}

// --- TinderLayout Components ---

export function IdeaCardPreview({ props }: PreviewProps) {
  const swipeDirection = (props.swipeDirection as string) || 'none';

  const rotation = swipeDirection === 'left' ? -8 : swipeDirection === 'right' ? 8 : 0;
  const x = swipeDirection === 'left' ? -20 : swipeDirection === 'right' ? 20 : 0;

  return (
    <motion.div
      className="relative w-64 h-80 rounded-xl overflow-hidden"
      animate={{ rotate: rotation, x }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black border border-gray-700/50" />
      <div className="relative h-full p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🌙</span>
          <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full">Feature</span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Add Dark Mode</h3>
        <p className="text-sm text-gray-400 flex-1">
          Implement a system-wide dark mode toggle that respects user OS preferences.
        </p>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700/50">
          <span className="text-xs text-gray-500">zen_architect</span>
          <span className="text-xs text-cyan-400">Impact: High</span>
        </div>
      </div>
      {swipeDirection === 'right' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-4 left-4 px-3 py-1.5 bg-green-500/30 border-2 border-green-500 rounded-lg"
        >
          <span className="text-green-400 font-bold text-sm">ACCEPT</span>
        </motion.div>
      )}
      {swipeDirection === 'left' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-4 right-4 px-3 py-1.5 bg-red-500/30 border-2 border-red-500 rounded-lg"
        >
          <span className="text-red-400 font-bold text-sm">REJECT</span>
        </motion.div>
      )}
    </motion.div>
  );
}

export function SwipeProgressPreview({ props }: PreviewProps) {
  const variant = (props.variant as string) || 'full';

  const total = 20;
  const reviewed = 12;
  const accepted = 8;
  const rejected = 4;
  const progress = (reviewed / total) * 100;

  if (variant === 'badges') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
          <Heart className="w-3 h-3 text-green-400" />
          <span className="text-xs text-green-400">{accepted}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 rounded-full">
          <ThumbsDown className="w-3 h-3 text-red-400" />
          <span className="text-xs text-red-400">{rejected}</span>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-gray-400">{reviewed}/{total}</span>
      </div>
    );
  }

  return (
    <div className="w-64 p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-300">Progress</span>
        <span className="text-xs text-cyan-400">{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full bg-gradient-to-r from-green-500 via-cyan-500 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-green-400">
          <Heart className="w-3 h-3" /> {accepted}
        </div>
        <div className="flex items-center gap-1 text-red-400">
          <ThumbsDown className="w-3 h-3" /> {rejected}
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <Clock className="w-3 h-3" /> {total - reviewed}
        </div>
      </div>
    </div>
  );
}

// --- TaskRunnerLayout Components ---

export function SessionBatchDisplayPreview({ props }: PreviewProps) {
  const status = (props.status as string) || 'running';

  const statusStyles: Record<string, { bg: string; border: string; glow: string; text: string }> = {
    running: { bg: 'from-cyan-900/30 to-blue-900/30', border: 'border-cyan-500/40', glow: 'shadow-cyan-500/20', text: 'text-cyan-400' },
    paused: { bg: 'from-yellow-900/30 to-orange-900/30', border: 'border-yellow-500/40', glow: 'shadow-yellow-500/20', text: 'text-yellow-400' },
    completed: { bg: 'from-green-900/30 to-emerald-900/30', border: 'border-green-500/40', glow: 'shadow-green-500/20', text: 'text-green-400' },
    idle: { bg: 'from-gray-900/30 to-gray-800/30', border: 'border-gray-600/40', glow: '', text: 'text-gray-400' },
  };

  const styles = statusStyles[status] || statusStyles.idle;

  return (
    <motion.div
      className={`w-72 p-4 rounded-xl border ${styles.border} bg-gradient-to-br ${styles.bg} shadow-lg ${styles.glow}`}
      animate={status === 'running' ? { boxShadow: ['0 0 20px rgba(6,182,212,0.2)', '0 0 30px rgba(6,182,212,0.3)', '0 0 20px rgba(6,182,212,0.2)'] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {status === 'running' && <Play className={`w-4 h-4 ${styles.text}`} />}
          {status === 'paused' && <Pause className={`w-4 h-4 ${styles.text}`} />}
          {status === 'completed' && <CheckCircle className={`w-4 h-4 ${styles.text}`} />}
          {status === 'idle' && <Circle className={`w-4 h-4 ${styles.text}`} />}
          <span className={`text-sm font-semibold ${styles.text}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </div>
        <span className="text-xs font-mono text-gray-500">batch-001</span>
      </div>
      <div className="space-y-2">
        {['Task 1', 'Task 2', 'Task 3'].map((task, i) => (
          <motion.div
            key={task}
            className="flex items-center gap-2 text-xs"
            animate={status === 'running' && i === 1 ? { opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {i === 0 ? (
              <CheckCircle className="w-3 h-3 text-green-400" />
            ) : i === 1 && status === 'running' ? (
              <motion.div
                className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <Circle className="w-3 h-3 text-gray-600" />
            )}
            <span className={i === 0 ? 'text-gray-500 line-through' : i === 1 && status === 'running' ? 'text-cyan-400' : 'text-gray-400'}>{task}</span>
          </motion.div>
        ))}
      </div>
      {status === 'running' && (
        <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
            initial={{ width: '33%' }}
            animate={{ width: ['33%', '66%', '33%'] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
      )}
    </motion.div>
  );
}

export function CheckpointProgressPreview({ props }: PreviewProps) {
  const compact = props.compact === true;
  const status = (props.status as string) || 'in_progress';

  const checkpoints = [
    { label: 'Init', status: 'completed' },
    { label: 'Build', status },
    { label: 'Test', status: 'pending' },
    { label: 'Deploy', status: 'pending' },
  ];

  const statusIcons: Record<string, { icon: typeof Check; color: string }> = {
    completed: { icon: Check, color: 'text-green-400 bg-green-500/20 border-green-500/40' },
    in_progress: { icon: Play, color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40' },
    pending: { icon: Circle, color: 'text-gray-500 bg-gray-700/20 border-gray-600/40' },
    skipped: { icon: X, color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40' },
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {checkpoints.map((cp, i) => {
          const s = statusIcons[cp.status] || statusIcons.pending;
          return (
            <motion.div
              key={cp.label}
              className={`w-6 h-6 rounded border flex items-center justify-center ${s.color}`}
              animate={cp.status === 'in_progress' ? { opacity: [1, 0.5, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <s.icon className="w-3 h-3" />
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {checkpoints.map((cp, i) => {
        const s = statusIcons[cp.status] || statusIcons.pending;
        return (
          <div key={cp.label} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <motion.div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center ${s.color}`}
                animate={cp.status === 'in_progress' ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <s.icon className="w-4 h-4" />
              </motion.div>
              <span className="text-[10px] text-gray-500 mt-1">{cp.label}</span>
            </div>
            {i < checkpoints.length - 1 && (
              <div className={`w-6 h-0.5 ${cp.status === 'completed' ? 'bg-green-500/50' : 'bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- ManagerLayout Components ---

export function ImplementationLogCardPreview({ props }: PreviewProps) {
  const compact = props.compact === true;
  const tested = props.tested === true;

  if (compact) {
    return (
      <motion.div
        className="flex items-center gap-3 px-3 py-2 bg-gray-900/50 rounded-lg border border-gray-700/30 cursor-pointer"
        whileHover={{ backgroundColor: 'rgba(6,182,212,0.05)' }}
      >
        <div className="w-10 h-10 rounded bg-gradient-to-br from-cyan-900/30 to-blue-900/30 flex items-center justify-center">
          <FileText className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-gray-200 truncate block">Feature Implementation</span>
          <span className="text-xs text-gray-500">2 hours ago</span>
        </div>
        {tested && <Check className="w-4 h-4 text-green-400" />}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-64 rounded-xl overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-gray-900 via-gray-900 to-cyan-900/10 cursor-pointer"
      whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(6,182,212,0.15)' }}
    >
      {/* Scanline effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent"
        animate={{ y: ['-100%', '100%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        style={{ pointerEvents: 'none' }}
      />
      <div className="h-32 bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <Image className="w-12 h-12 text-gray-600" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-200">Dark Mode Feature</h3>
          {tested && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Check className="w-3 h-3" /> Tested
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">Implementation completed</p>
      </div>
    </motion.div>
  );
}

export function HypothesisRowPreview({ props }: PreviewProps) {
  const status = (props.status as string) || 'unverified';
  const category = (props.category as string) || 'behavior';

  const statusStyles: Record<string, { bg: string; text: string; icon: typeof Circle }> = {
    unverified: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: HelpCircle },
    in_progress: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', icon: Play },
    verified: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Eye },
    completed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
    disproven: { bg: 'bg-red-500/20', text: 'text-red-400', icon: X },
  };

  const categoryColors: Record<string, string> = {
    behavior: 'border-l-blue-500',
    performance: 'border-l-green-500',
    security: 'border-l-red-500',
    ux: 'border-l-purple-500',
  };

  const s = statusStyles[status] || statusStyles.unverified;

  return (
    <motion.div
      className={`w-72 p-3 bg-gray-900/50 rounded-lg border border-gray-700/30 border-l-2 ${categoryColors[category]} cursor-pointer`}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded ${s.bg}`}>
            <s.icon className={`w-3 h-3 ${s.text}`} />
          </div>
          <span className={`text-xs font-medium ${s.text}`}>{status.replace('_', ' ')}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </div>
      <h3 className="text-sm text-gray-200 mb-1">Users prefer dark mode</h3>
      <p className="text-xs text-gray-500">Based on user feedback analysis</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">{category}</span>
      </div>
    </motion.div>
  );
}

// --- ContextLayout Components ---

export function ContextJailCardPreview({ props }: PreviewProps) {
  const isSelected = props.isSelected === true;
  const taskCount = parseInt(props.taskCount as string) || 0;

  return (
    <motion.div
      className={`relative w-48 h-32 rounded-lg overflow-hidden cursor-pointer ${isSelected ? 'ring-2 ring-cyan-500/50' : ''}`}
      whileHover={{ scale: 1.02 }}
    >
      {/* Jail bars */}
      <div className="absolute inset-0 flex justify-around pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="w-0.5 h-full bg-gray-600/30"
            animate={isSelected ? { backgroundColor: 'rgba(6,182,212,0.3)' } : {}}
          />
        ))}
      </div>
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${isSelected ? 'from-cyan-900/20 to-blue-900/20' : 'from-gray-900/50 to-gray-800/50'} border border-gray-700/30`} />
      {/* Corner reinforcements */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-gray-600/50" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-gray-600/50" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-gray-600/50" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-gray-600/50" />
      {/* Content */}
      <div className="relative h-full p-3 flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <span className="text-sm font-medium text-gray-200">Auth Module</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">4 files</span>
          {taskCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full">{taskCount} tasks</span>
          )}
        </div>
      </div>
      {isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-cyan-500/5"
        />
      )}
    </motion.div>
  );
}

export function GradientPalettePickerPreview({ props }: PreviewProps) {
  const compact = props.compact === true;
  const primaryColor = (props.primaryColor as string) || '#06b6d4';

  const colors = ['#06b6d4', '#a855f7', '#ec4899', '#22c55e', '#f59e0b'];

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {colors.slice(0, 4).map((color) => (
          <motion.button
            key={color}
            className={`w-6 h-6 rounded-full border-2 ${color === primaryColor ? 'border-white' : 'border-transparent'}`}
            style={{ backgroundColor: color }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="w-48 p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">Color Palette</span>
        <div
          className="w-8 h-4 rounded"
          style={{ background: `linear-gradient(to right, ${primaryColor}, ${colors[1]})` }}
        />
      </div>
      <div className="flex items-center gap-2 mb-3">
        {colors.map((color) => (
          <motion.button
            key={color}
            className={`w-8 h-8 rounded-lg border-2 ${color === primaryColor ? 'border-white ring-2 ring-white/20' : 'border-gray-700'}`}
            style={{ backgroundColor: color }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          />
        ))}
      </div>
      <div
        className="h-12 rounded-lg"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${colors[1]} 50%, ${colors[2]} 100%)` }}
      />
    </div>
  );
}

// --- ReflectorLayout Components ---

export function WeeklyKPICardsPreview({ props }: PreviewProps) {
  const accentColor = (props.accentColor as string) || 'cyan';
  const showTrend = props.showTrend !== false;

  const colorStyles: Record<string, { bg: string; text: string; border: string }> = {
    amber: { bg: 'from-amber-900/20 to-orange-900/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    emerald: { bg: 'from-emerald-900/20 to-green-900/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    cyan: { bg: 'from-cyan-900/20 to-blue-900/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    purple: { bg: 'from-purple-900/20 to-pink-900/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  };

  const c = colorStyles[accentColor] || colorStyles.cyan;

  return (
    <motion.div
      className={`relative w-40 p-4 rounded-xl border ${c.border} bg-gradient-to-br ${c.bg} overflow-hidden`}
      whileHover={{ scale: 1.02 }}
    >
      {/* Corner markers */}
      <div className={`absolute top-1 left-1 w-2 h-2 border-t border-l ${c.border}`} />
      <div className={`absolute top-1 right-1 w-2 h-2 border-t border-r ${c.border}`} />
      <div className={`absolute bottom-1 left-1 w-2 h-2 border-b border-l ${c.border}`} />
      <div className={`absolute bottom-1 right-1 w-2 h-2 border-b border-r ${c.border}`} />
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className={`w-4 h-4 ${c.text}`} />
        <span className="text-xs text-gray-400">Total Ideas</span>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-2xl font-bold ${c.text}`}>45</span>
        {showTrend && (
          <div className="flex items-center gap-0.5 text-green-400 mb-1">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs">+12%</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function KPISummaryCardsPreview({ props }: PreviewProps) {
  const confettiEnabled = props.confettiEnabled !== false;
  const cardType = (props.cardType as string) || 'total';

  const cardStyles: Record<string, { icon: typeof Target; label: string; value: string; color: string }> = {
    total: { icon: Target, label: 'Total', value: '100', color: 'text-cyan-400' },
    rate: { icon: TrendingUp, label: 'Accept Rate', value: '75%', color: 'text-green-400' },
    impact: { icon: Zap, label: 'Impact', value: '8.5', color: 'text-amber-400' },
    specialists: { icon: Sparkles, label: 'Active', value: '12', color: 'text-purple-400' },
  };

  const card = cardStyles[cardType] || cardStyles.total;

  return (
    <motion.div
      className="relative w-36 p-4 bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-xl border border-gray-700/30 overflow-hidden"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', bounce: 0.3 }}
    >
      {confettiEnabled && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full"
              style={{ left: `${20 + i * 15}%`, top: '20%' }}
              animate={{ y: [0, 30], opacity: [1, 0] }}
              transition={{ duration: 1, delay: i * 0.1, repeat: Infinity, repeatDelay: 5 }}
            />
          ))}
        </motion.div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <card.icon className={`w-4 h-4 ${card.color}`} />
        <span className="text-xs text-gray-400">{card.label}</span>
      </div>
      <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
    </motion.div>
  );
}

// --- SocialLayout Components ---

export function SLABadgePreview({ props }: PreviewProps) {
  const status = (props.status as string) || 'ok';
  const compact = props.compact === true;

  const statusStyles: Record<string, { bg: string; text: string; icon: typeof Check }> = {
    ok: { bg: 'bg-green-500/20', text: 'text-green-400', icon: Check },
    warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: AlertTriangle },
    critical: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: AlertTriangle },
    overdue: { bg: 'bg-red-500/20', text: 'text-red-400', icon: X },
  };

  const s = statusStyles[status] || statusStyles.ok;

  if (compact) {
    return (
      <motion.div
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${s.bg}`}
        animate={status === 'critical' || status === 'overdue' ? { opacity: [1, 0.7, 1] } : {}}
        transition={{ duration: 0.8, repeat: Infinity }}
      >
        <s.icon className={`w-3 h-3 ${s.text}`} />
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${s.bg} border border-gray-700/30`}
      animate={status === 'critical' || status === 'overdue' ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <s.icon className={`w-4 h-4 ${s.text}`} />
      <span className={`text-sm font-medium ${s.text}`}>{status.toUpperCase()}</span>
      <span className="text-xs text-gray-500">2h left</span>
    </motion.div>
  );
}

export function AIProcessingPanelPreview({ props }: PreviewProps) {
  const status = (props.status as string) || 'idle';

  const statusStyles: Record<string, { bg: string; text: string; progress: string }> = {
    idle: { bg: 'from-gray-900/50 to-gray-800/50', text: 'text-gray-400', progress: 'bg-gray-600' },
    processing: { bg: 'from-blue-900/30 to-indigo-900/30', text: 'text-blue-400', progress: 'from-blue-500 to-indigo-500' },
    success: { bg: 'from-green-900/30 to-emerald-900/30', text: 'text-green-400', progress: 'from-green-500 to-emerald-500' },
    error: { bg: 'from-red-900/30 to-rose-900/30', text: 'text-red-400', progress: 'from-red-500 to-rose-500' },
  };

  const s = statusStyles[status] || statusStyles.idle;

  return (
    <motion.div
      className={`w-64 p-4 rounded-xl border border-gray-700/30 bg-gradient-to-br ${s.bg}`}
      animate={status === 'processing' ? { boxShadow: ['0 0 0 rgba(59,130,246,0)', '0 0 20px rgba(59,130,246,0.2)', '0 0 0 rgba(59,130,246,0)'] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className={`w-5 h-5 ${s.text}`} />
        <span className="text-sm font-medium text-gray-200">Gemini Processing</span>
      </div>
      {status === 'idle' && (
        <p className="text-xs text-gray-500 mb-3">Select items to process with AI</p>
      )}
      {status === 'processing' && (
        <>
          <p className="text-xs text-gray-400 mb-2">Analyzing 5 items...</p>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${s.progress}`}
              animate={{ width: ['0%', '70%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </>
      )}
      {status === 'success' && (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-xs text-green-400">Completed successfully</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2">
          <X className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-400">Processing failed</span>
        </div>
      )}
      <motion.button
        className={`mt-3 w-full py-2 rounded-lg text-sm font-medium ${status === 'idle' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'}`}
        whileHover={status === 'idle' ? { scale: 1.02 } : {}}
        whileTap={status === 'idle' ? { scale: 0.98 } : {}}
      >
        {status === 'idle' ? 'Start Processing' : status === 'processing' ? 'Processing...' : 'Done'}
      </motion.button>
    </motion.div>
  );
}

// --- BlueprintComposer Components ---

export function ChainBuilderPreview({ props }: PreviewProps) {
  const hasChains = props.hasChains !== false;

  const steps = hasChains
    ? [
        { label: 'Analyze', color: 'bg-cyan-500' },
        { label: 'Transform', color: 'bg-purple-500' },
        { label: 'Execute', color: 'bg-green-500' },
      ]
    : [];

  return (
    <div className="w-72 p-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-200">Chain Builder</span>
        <GitBranch className="w-4 h-4 text-gray-500" />
      </div>
      {hasChains ? (
        <div className="space-y-2">
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={`w-3 h-3 rounded-full ${step.color}`} />
              <div className="flex-1 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/30">
                <span className="text-xs text-gray-300">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <ChevronDown className="w-4 h-4 text-gray-600 -my-1" />
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg">
          <span className="text-xs text-gray-500">Drop steps here</span>
        </div>
      )}
    </div>
  );
}

export function DecisionNodeConfigPreview({ props }: PreviewProps) {
  const position = (props.position as string) || 'after-analyzer';
  const enabled = props.enabled !== false;

  return (
    <motion.div
      className={`w-56 p-3 rounded-lg border ${enabled ? 'border-cyan-500/40 bg-cyan-900/10' : 'border-gray-700/30 bg-gray-900/50'}`}
      animate={enabled ? { boxShadow: '0 0 15px rgba(6,182,212,0.1)' } : {}}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Settings className={`w-4 h-4 ${enabled ? 'text-cyan-400' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${enabled ? 'text-gray-200' : 'text-gray-500'}`}>Decision Node</span>
        </div>
        <motion.button
          className={`w-10 h-5 rounded-full ${enabled ? 'bg-cyan-500' : 'bg-gray-700'} relative`}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            className="absolute top-0.5 w-4 h-4 bg-white rounded-full"
            animate={{ left: enabled ? '22px' : '2px' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </motion.button>
      </div>
      <div className="text-xs text-gray-500 mb-2">Position: {position.replace('-', ' ')}</div>
      {enabled && (
        <div className="flex gap-1">
          {['low', 'medium', 'high'].map((severity) => (
            <button
              key={severity}
              className={`flex-1 py-1 text-[10px] rounded ${severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-gray-800 text-gray-500'}`}
            >
              {severity}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// --- ZenLayout Components ---

export function ZenStatsPreview({ props }: PreviewProps) {
  const variant = (props.variant as string) || 'completed';

  const variants: Record<string, { label: string; value: number; color: string; bg: string }> = {
    completed: { label: 'Completed', value: 24, color: 'text-green-400', bg: 'from-green-900/20 to-emerald-900/20' },
    pending: { label: 'Pending', value: 8, color: 'text-yellow-400', bg: 'from-yellow-900/20 to-amber-900/20' },
    failed: { label: 'Failed', value: 2, color: 'text-red-400', bg: 'from-red-900/20 to-rose-900/20' },
  };

  const v = variants[variant] || variants.completed;

  return (
    <motion.div
      className={`w-32 p-4 rounded-xl bg-gradient-to-br ${v.bg} border border-gray-700/30 backdrop-blur-sm`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span className="text-xs text-gray-400 block mb-1">{v.label}</span>
      <span className={`text-2xl font-bold ${v.color}`}>{v.value}</span>
    </motion.div>
  );
}

export function ModeTogglePreview({ props }: PreviewProps) {
  const mode = (props.mode as string) || 'offline';
  const isOnline = mode === 'online';

  return (
    <motion.button
      className={`relative w-20 h-10 rounded-full ${isOnline ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-gray-700 to-gray-600'} border border-gray-600/30`}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="absolute top-1 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center"
        animate={{ left: isOnline ? '40px' : '4px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-600" />
        ) : (
          <WifiOff className="w-4 h-4 text-gray-600" />
        )}
      </motion.div>
      {isOnline && (
        <motion.div
          className="absolute top-1/2 right-3 w-1.5 h-1.5 bg-green-400 rounded-full"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{ transform: 'translateY(-50%)' }}
        />
      )}
    </motion.button>
  );
}

// --- QuestionsLayout Components ---

export function ContextMapSelectorPreview({ props }: PreviewProps) {
  const state = (props.state as string) || 'default';

  if (state === 'loading') {
    return (
      <div className="w-48 p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="w-48 p-4 bg-red-900/10 rounded-lg border border-red-500/30">
        <div className="flex items-center gap-2 text-red-400">
          <X className="w-4 h-4" />
          <span className="text-sm">Failed to load</span>
        </div>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className="w-48 p-4 bg-gray-900/50 rounded-lg border border-gray-700/30 text-center">
        <Folder className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <span className="text-sm text-gray-500">No contexts</span>
      </div>
    );
  }

  const contexts = [
    { name: 'Auth', files: 4, selected: true },
    { name: 'Dashboard', files: 8, selected: false },
    { name: 'API', files: 12, selected: true },
  ];

  return (
    <div className="w-48 bg-gray-900/50 rounded-lg border border-gray-700/30 overflow-hidden">
      <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-700/30">
        <span className="text-xs font-medium text-gray-300">Context Map</span>
      </div>
      <div className="p-2 space-y-1">
        {contexts.map((ctx) => (
          <motion.div
            key={ctx.name}
            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${ctx.selected ? 'bg-cyan-500/20 border border-cyan-500/30' : 'hover:bg-gray-800/50'}`}
            whileHover={{ x: 2 }}
          >
            <div className={`w-3 h-3 rounded-sm border ${ctx.selected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-600'} flex items-center justify-center`}>
              {ctx.selected && <Check className="w-2 h-2 text-white" />}
            </div>
            <span className={`text-xs flex-1 ${ctx.selected ? 'text-cyan-400' : 'text-gray-400'}`}>{ctx.name}</span>
            <span className="text-[10px] text-gray-600">{ctx.files}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function DirectionCardPreview({ props }: PreviewProps) {
  const status = (props.status as string) || 'pending';

  const statusStyles: Record<string, { bg: string; border: string; text: string }> = {
    pending: { bg: 'from-gray-900/50 to-gray-800/50', border: 'border-gray-700/30', text: 'text-gray-400' },
    accepted: { bg: 'from-green-900/20 to-emerald-900/20', border: 'border-green-500/30', text: 'text-green-400' },
    rejected: { bg: 'from-red-900/20 to-rose-900/20', border: 'border-red-500/30', text: 'text-red-400' },
  };

  const s = statusStyles[status] || statusStyles.pending;

  return (
    <motion.div
      className={`w-64 p-4 rounded-xl border ${s.border} bg-gradient-to-br ${s.bg}`}
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium ${s.text}`}>{status.toUpperCase()}</span>
        {status === 'pending' && (
          <motion.div
            className="w-2 h-2 bg-yellow-500 rounded-full"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-200 mb-2">Add input validation</h3>
      <p className="text-xs text-gray-500 mb-3">Validate user inputs before form submission</p>
      {status === 'pending' && (
        <div className="flex items-center gap-2">
          <motion.button
            className="flex-1 py-1.5 bg-green-500/20 text-green-400 rounded text-xs border border-green-500/30"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Accept
          </motion.button>
          <motion.button
            className="flex-1 py-1.5 bg-red-500/20 text-red-400 rounded text-xs border border-red-500/30"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Reject
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

// --- RefactorPage Components ---

export function PackageCardPreview({ props }: PreviewProps) {
  const category = (props.category as string) || 'cleanup';
  const isSelected = props.isSelected === true;

  const categoryStyles: Record<string, { bg: string; border: string; text: string }> = {
    migration: { bg: 'from-blue-900/30 to-indigo-900/30', border: 'border-blue-500/40', text: 'text-blue-400' },
    cleanup: { bg: 'from-cyan-900/30 to-teal-900/30', border: 'border-cyan-500/40', text: 'text-cyan-400' },
    security: { bg: 'from-red-900/30 to-rose-900/30', border: 'border-red-500/40', text: 'text-red-400' },
    performance: { bg: 'from-green-900/30 to-emerald-900/30', border: 'border-green-500/40', text: 'text-green-400' },
    architecture: { bg: 'from-purple-900/30 to-pink-900/30', border: 'border-purple-500/40', text: 'text-purple-400' },
  };

  const c = categoryStyles[category] || categoryStyles.cleanup;

  return (
    <motion.div
      className={`relative w-56 p-4 rounded-xl border ${c.border} bg-gradient-to-br ${c.bg} overflow-hidden cursor-pointer ${isSelected ? 'ring-2 ring-white/30' : ''}`}
      whileHover={{ scale: 1.02 }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Package className={`w-4 h-4 ${c.text}`} />
          <span className={`text-xs font-semibold uppercase ${c.text}`}>{category}</span>
        </div>
        <h3 className="text-sm font-medium text-gray-200 mb-1">Cleanup Utils</h3>
        <p className="text-xs text-gray-500 mb-3">Remove unused code and dependencies</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">8 issues</span>
          {isSelected && <Check className="w-4 h-4 text-white" />}
        </div>
      </div>
    </motion.div>
  );
}

export function HeroBadgePreview({ props }: PreviewProps) {
  const isVisible = props.isVisible !== false;

  if (!isVisible) {
    return (
      <div className="w-48 h-32 flex items-center justify-center bg-gray-900/30 rounded-xl border border-gray-700/30">
        <span className="text-xs text-gray-500">Badge hidden</span>
      </div>
    );
  }

  return (
    <motion.div
      className="relative w-64 p-6 rounded-2xl bg-gradient-to-br from-amber-900/30 via-yellow-900/20 to-orange-900/30 border border-amber-500/30 overflow-hidden"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', bounce: 0.4 }}
    >
      {/* Confetti burst effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.5 }}
      >
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              left: '50%',
              top: '30%',
              backgroundColor: ['#fbbf24', '#f59e0b', '#d97706', '#f97316'][i % 4],
            }}
            animate={{
              x: [0, (i % 2 === 0 ? 1 : -1) * (40 + i * 10)],
              y: [0, -20 + i * 15],
              opacity: [1, 0],
            }}
            transition={{ duration: 0.8, delay: i * 0.05 }}
          />
        ))}
      </motion.div>
      {/* Trophy spotlight */}
      <div className="flex flex-col items-center text-center">
        <motion.div
          className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/30 to-yellow-500/30 flex items-center justify-center mb-3"
          animate={{ boxShadow: ['0 0 20px rgba(251,191,36,0.2)', '0 0 40px rgba(251,191,36,0.4)', '0 0 20px rgba(251,191,36,0.2)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Trophy className="w-8 h-8 text-amber-400" />
        </motion.div>
        <h3 className="text-lg font-bold text-amber-300 mb-1">Refactor Hero!</h3>
        <p className="text-xs text-gray-400 mb-3">42 opportunities found</p>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-center">
            <span className="block text-amber-400 font-bold">15</span>
            <span className="text-gray-500">Files</span>
          </div>
          <div className="text-center">
            <span className="block text-amber-400 font-bold">3</span>
            <span className="text-gray-500">Batches</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
