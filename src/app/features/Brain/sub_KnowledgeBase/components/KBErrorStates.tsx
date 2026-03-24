'use client';

import { motion } from 'framer-motion';
import { BRAIN_CHART } from '../../lib/brainChartColors';

const AMBER = BRAIN_CHART.warning;   // #f59e0b
const RED = BRAIN_CHART.negative;     // #ef4444
const PURPLE = BRAIN_CHART.brand.accent; // #8b5cf6

// ─── Error type classification ────────────────────────────────────────────────

export type KBErrorKind = 'network' | 'validation' | 'unknown';

export function classifyError(error: string): KBErrorKind {
  const lower = error.toLowerCase();
  if (
    lower.includes('fetch') ||
    lower.includes('network') ||
    lower.includes('connection') ||
    lower.includes('timeout') ||
    lower.includes('abort') ||
    lower.includes('cors')
  ) return 'network';
  if (
    lower.includes('valid') ||
    lower.includes('required') ||
    lower.includes('missing') ||
    lower.includes('constraint') ||
    lower.includes('duplicate')
  ) return 'validation';
  return 'unknown';
}

// ─── SVG Illustrations ────────────────────────────────────────────────────────

/**
 * Disconnected grid node with gentle amber glow.
 * Represents network/connection errors.
 */
export function DisconnectedGridSvg({ reducedMotion }: { reducedMotion?: boolean | null }) {
  const dots: { cx: number; cy: number }[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      dots.push({ cx: 10 + col * 16, cy: 8 + row * 16 });
    }
  }

  const connectedEdges = [
    { x1: 10, y1: 8, x2: 26, y2: 8 },
    { x1: 26, y1: 8, x2: 26, y2: 24 },
    { x1: 10, y1: 24, x2: 10, y2: 40 },
    { x1: 42, y1: 24, x2: 58, y2: 24 },
    { x1: 58, y1: 40, x2: 74, y2: 40 },
    { x1: 42, y1: 40, x2: 42, y2: 56 },
  ];

  // The broken connection — dashed, with the central node disconnected
  const brokenEdges = [
    { x1: 26, y1: 24, x2: 42, y2: 24 },
    { x1: 42, y1: 24, x2: 42, y2: 40 },
    { x1: 26, y1: 24, x2: 26, y2: 40 },
  ];

  // The disconnected node
  const disconnectedNode = { cx: 42, cy: 40 };

  return (
    <svg width="84" height="68" viewBox="0 0 84 68" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <radialGradient id="kbNetErrGlow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor={AMBER} stopOpacity="0.18" />
          <stop offset="100%" stopColor={AMBER} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient amber glow behind the disconnected area */}
      <ellipse cx="42" cy="40" rx="28" ry="22" fill="url(#kbNetErrGlow)" />

      {/* Dot grid */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r="1" fill="#3f3f46" opacity="0.2" />
      ))}

      {/* Connected edges — solid, dim */}
      {connectedEdges.map((e, i) => (
        <line key={`c-${i}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke="#52525b" strokeWidth="0.8" opacity="0.25" />
      ))}

      {/* Broken edges — dashed, amber, pulsing */}
      {brokenEdges.map((e, i) =>
        reducedMotion ? (
          <line key={`b-${i}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={AMBER} strokeWidth="0.8" strokeDasharray="2 3" opacity="0.3" />
        ) : (
          <motion.line key={`b-${i}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={AMBER} strokeWidth="0.8" strokeDasharray="2 3"
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 3, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )
      )}

      {/* Connected nodes — stable zinc */}
      {[{ cx: 10, cy: 8 }, { cx: 26, cy: 8 }, { cx: 10, cy: 24 }, { cx: 26, cy: 24 },
        { cx: 58, cy: 24 }, { cx: 74, cy: 40 }, { cx: 42, cy: 56 }, { cx: 10, cy: 40 }]
        .map((n, i) => (
          <circle key={`n-${i}`} cx={n.cx} cy={n.cy} r="2" fill="#52525b" opacity="0.4" />
        ))}

      {/* Disconnected node — amber, glowing */}
      {reducedMotion ? (
        <circle cx={disconnectedNode.cx} cy={disconnectedNode.cy} r="3.5" fill={AMBER} opacity="0.5" />
      ) : (
        <>
          <motion.circle cx={disconnectedNode.cx} cy={disconnectedNode.cy} r="6"
            fill={AMBER} opacity="0"
            animate={{ opacity: [0, 0.08, 0], r: [4, 8, 4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.circle cx={disconnectedNode.cx} cy={disconnectedNode.cy} r="3.5"
            fill={AMBER}
            animate={{ opacity: [0.35, 0.65, 0.35] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      {/* Small "disconnect" spark marks near the broken node */}
      {!reducedMotion && (
        <motion.g
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{ duration: 2.5, delay: 1, repeat: Infinity }}
        >
          <line x1="36" y1="35" x2="34" y2="33" stroke={AMBER} strokeWidth="0.7" strokeLinecap="round" />
          <line x1="48" y1="35" x2="50" y2="33" stroke={AMBER} strokeWidth="0.7" strokeLinecap="round" />
        </motion.g>
      )}
    </svg>
  );
}

/**
 * Broken confidence bar — segments split apart with a fracture.
 * Represents validation / data integrity errors.
 */
export function BrokenConfidenceBarSvg({ reducedMotion }: { reducedMotion?: boolean | null }) {
  return (
    <svg width="84" height="52" viewBox="0 0 84 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="kbValBarL" x1="0" y1="0" x2="36" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={RED} stopOpacity="0.7" />
          <stop offset="100%" stopColor={RED} stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="kbValBarR" x1="48" y1="0" x2="84" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={RED} stopOpacity="0.25" />
          <stop offset="100%" stopColor="#52525b" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Background bar track */}
      <rect x="4" y="20" width="76" height="12" rx="3" fill="#27272a" opacity="0.5" />

      {/* Left segment — filled portion, slightly shifted left */}
      {reducedMotion ? (
        <rect x="4" y="20" width="33" height="12" rx="3" fill="url(#kbValBarL)" opacity="0.7" />
      ) : (
        <motion.rect x="4" y="20" width="33" height="12" rx="3"
          fill="url(#kbValBarL)"
          animate={{ x: [4, 2, 4], opacity: [0.7, 0.5, 0.7] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Right segment — empty portion, shifted right */}
      {reducedMotion ? (
        <rect x="47" y="20" width="33" height="12" rx="3" fill="url(#kbValBarR)" opacity="0.5" />
      ) : (
        <motion.rect x="47" y="20" width="33" height="12" rx="3"
          fill="url(#kbValBarR)"
          animate={{ x: [47, 49, 47], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Fracture line in the gap */}
      {reducedMotion ? (
        <g opacity="0.4">
          <line x1="40" y1="17" x2="38" y2="26" stroke={RED} strokeWidth="1" strokeLinecap="round" />
          <line x1="38" y1="26" x2="42" y2="35" stroke={RED} strokeWidth="1" strokeLinecap="round" />
        </g>
      ) : (
        <motion.g
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <line x1="40" y1="17" x2="38" y2="26" stroke={RED} strokeWidth="1" strokeLinecap="round" />
          <line x1="38" y1="26" x2="42" y2="35" stroke={RED} strokeWidth="1" strokeLinecap="round" />
          {/* Small fracture sparks */}
          <line x1="36" y1="22" x2="34" y2="20" stroke={RED} strokeWidth="0.6" opacity="0.5" />
          <line x1="43" y1="30" x2="45" y2="32" stroke={RED} strokeWidth="0.6" opacity="0.5" />
        </motion.g>
      )}

      {/* Confidence labels floating above */}
      <text x="18" y="14" textAnchor="middle" fill={RED} fontSize="7" fontFamily="monospace" opacity="0.4">63%</text>
      {!reducedMotion && (
        <motion.text x="62" y="46" textAnchor="middle" fill="#52525b" fontSize="6" fontFamily="monospace"
          animate={{ opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 3, delay: 1, repeat: Infinity }}
        >
          ???
        </motion.text>
      )}
    </svg>
  );
}

/**
 * Scattered puzzle pieces — pieces that don't connect.
 * Represents unknown / unexpected errors.
 */
export function ScatteredPuzzleSvg({ reducedMotion }: { reducedMotion?: boolean | null }) {
  // Four puzzle piece outlines, scattered at different rotations
  const pieces = [
    { x: 12, y: 10, rotate: -12, delay: 0 },
    { x: 44, y: 6, rotate: 8, delay: 0.6 },
    { x: 24, y: 36, rotate: -5, delay: 1.2 },
    { x: 56, y: 32, rotate: 15, delay: 1.8 },
  ];

  const PuzzlePiece = ({ x, y, rotate, delay, index }: { x: number; y: number; rotate: number; delay: number; index: number }) => {
    const colors = [PURPLE, '#7c3aed', '#6d28d9', '#8b5cf6'];
    const color = colors[index % colors.length];

    const pieceContent = (
      <g transform={`translate(${x}, ${y}) rotate(${rotate})`}>
        {/* Simplified puzzle piece shape */}
        <path
          d="M0,0 L8,0 L8,3 C8,3 10,2 10,4.5 C10,7 8,6 8,6 L8,10 L0,10 L0,7 C0,7 -2,8 -2,5.5 C-2,3 0,4 0,4 Z"
          fill={color}
          fillOpacity="0.12"
          stroke={color}
          strokeWidth="0.6"
          strokeOpacity="0.35"
        />
      </g>
    );

    if (reducedMotion) {
      return <g key={index} opacity="0.5">{pieceContent}</g>;
    }

    return (
      <motion.g
        key={index}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          y: [0, -1.5, 0],
        }}
        transition={{
          duration: 4,
          delay,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {pieceContent}
      </motion.g>
    );
  };

  return (
    <svg width="84" height="58" viewBox="0 0 84 58" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <radialGradient id="kbUnkErrGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={PURPLE} stopOpacity="0.1" />
          <stop offset="100%" stopColor={PURPLE} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient glow */}
      <ellipse cx="42" cy="29" rx="35" ry="24" fill="url(#kbUnkErrGlow)" />

      {/* Faint connection lines that don't reach (dashed) */}
      {[
        { x1: 20, y1: 18, x2: 44, y2: 14 },
        { x1: 32, y1: 44, x2: 56, y2: 38 },
        { x1: 20, y1: 18, x2: 32, y2: 44 },
      ].map((e, i) => (
        <line key={`cl-${i}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke={PURPLE} strokeWidth="0.4" strokeDasharray="1.5 4" opacity="0.12" />
      ))}

      {/* Scattered pieces */}
      {pieces.map((p, i) => (
        <PuzzlePiece key={i} index={i} {...p} />
      ))}

      {/* Question mark in center, very faint */}
      {!reducedMotion ? (
        <motion.text x="42" y="30" textAnchor="middle" fill={PURPLE} fontSize="10"
          fontFamily="monospace" fontWeight="bold"
          animate={{ opacity: [0.08, 0.2, 0.08] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          ?
        </motion.text>
      ) : (
        <text x="42" y="30" textAnchor="middle" fill={PURPLE} fontSize="10"
          fontFamily="monospace" fontWeight="bold" opacity="0.15"
        >
          ?
        </text>
      )}
    </svg>
  );
}

// ─── Empathetic copy per error kind ───────────────────────────────────────────

interface ErrorCopy {
  title: string;
  description: string;
}

const ERROR_COPY: Record<string, Record<KBErrorKind, ErrorCopy>> = {
  fetch: {
    network: {
      title: 'Connection interrupted',
      description: 'Could not reach the knowledge base \u2014 the connection dropped. Your data is safe, and we\u2019ll retry when you\u2019re back online.',
    },
    validation: {
      title: 'Unexpected data format',
      description: 'The knowledge base returned something we didn\u2019t expect. Try refreshing \u2014 if it persists, the data may need repair.',
    },
    unknown: {
      title: 'Something went wrong',
      description: 'We couldn\u2019t load your knowledge entries. This is unusual \u2014 try refreshing the page.',
    },
  },
  create: {
    network: {
      title: 'Could not save your pattern',
      description: 'The connection dropped before we could save. Your draft is preserved \u2014 try again when connectivity returns.',
    },
    validation: {
      title: 'Entry couldn\u2019t be saved',
      description: 'Something about the entry data didn\u2019t pass validation. Check your fields and try again.',
    },
    unknown: {
      title: 'Save failed unexpectedly',
      description: 'We weren\u2019t able to create this entry. Your input is still here \u2014 try submitting again.',
    },
  },
  feedback: {
    network: {
      title: 'Feedback not sent',
      description: 'The connection dropped before your feedback reached us. Give it another try.',
    },
    validation: {
      title: 'Feedback couldn\u2019t be recorded',
      description: 'Something went wrong recording your response. The entry itself is unaffected.',
    },
    unknown: {
      title: 'Feedback failed',
      description: 'We couldn\u2019t record your feedback this time. The entry is safe \u2014 try again.',
    },
  },
};

export function getErrorCopy(context: 'fetch' | 'create' | 'feedback', error: string): ErrorCopy {
  const kind = classifyError(error);
  return ERROR_COPY[context][kind];
}

export function getErrorIllustration(error: string, reducedMotion?: boolean | null) {
  const kind = classifyError(error);
  switch (kind) {
    case 'network':
      return <DisconnectedGridSvg reducedMotion={reducedMotion} />;
    case 'validation':
      return <BrokenConfidenceBarSvg reducedMotion={reducedMotion} />;
    default:
      return <ScatteredPuzzleSvg reducedMotion={reducedMotion} />;
  }
}

// ─── Inline Error Banner ──────────────────────────────────────────────────────

interface KBErrorBannerProps {
  error: string;
  context: 'fetch' | 'create' | 'feedback';
  onDismiss?: () => void;
  onRetry?: () => void;
  reducedMotion?: boolean | null;
  compact?: boolean;
}

export function KBErrorBanner({ error, context, onDismiss, onRetry, reducedMotion, compact }: KBErrorBannerProps) {
  const copy = getErrorCopy(context, error);
  const kind = classifyError(error);

  const borderColor = kind === 'network'
    ? 'border-amber-500/20'
    : kind === 'validation'
      ? 'border-red-500/20'
      : 'border-purple-500/20';

  const bgColor = kind === 'network'
    ? 'bg-amber-500/5'
    : kind === 'validation'
      ? 'bg-red-500/5'
      : 'bg-purple-500/5';

  if (compact) {
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${borderColor} ${bgColor}`}
      >
        <div className="flex-shrink-0 scale-[0.6] origin-center -mx-3">
          {getErrorIllustration(error, reducedMotion)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-zinc-300">{copy.title}</p>
          <p className="text-2xs text-zinc-500 mt-0.5 leading-relaxed">{copy.description}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onRetry && (
            <button onClick={onRetry}
              className="px-2 py-1 rounded text-2xs font-medium text-zinc-300 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors">
              Retry
            </button>
          )}
          {onDismiss && (
            <button onClick={onDismiss}
              className="px-1.5 py-1 rounded text-2xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Dismiss
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
      className={`flex flex-col items-center gap-3 py-8 px-6 rounded-xl border ${borderColor} ${bgColor}`}
    >
      <div className="flex-shrink-0">
        {getErrorIllustration(error, reducedMotion)}
      </div>
      <div className="text-center">
        <h4 className="text-sm font-medium text-zinc-300">{copy.title}</h4>
        <p className="text-xs text-zinc-500 mt-1.5 max-w-xs leading-relaxed">{copy.description}</p>
      </div>
      {(onRetry || onDismiss) && (
        <div className="flex items-center gap-2 mt-1">
          {onRetry && (
            <button onClick={onRetry}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/30 transition-colors">
              Try again
            </button>
          )}
          {onDismiss && (
            <button onClick={onDismiss}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Dismiss
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
